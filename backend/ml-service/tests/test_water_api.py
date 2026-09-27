import os
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import app as service_app
import water_api


class WaterApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test.sqlite3"
        self.path_patch = patch.object(water_api, "DB_PATH", self.db_path)
        self.path_patch.start()
        water_api.initialize_database()

    def tearDown(self):
        self.path_patch.stop()
        self.temp_dir.cleanup()

    def test_dataset_import_is_idempotent_and_preserves_sample_id(self):
        csv_text = (
            "sample_id,sample_date,city,state,latitude,longitude,pH,tds_mg_l,turbidity_ntu,temperature_c,"
            "demo_water_status\n"
            "WQ-1,2024-08-01,Raipur,Chhattisgarh,21.25,81.61,7.2,300,2.1,27,Good\n"
        )
        first = water_api.import_csv(csv_text)
        second = water_api.import_csv(csv_text)
        self.assertEqual(first["imported"], 1)
        self.assertEqual(second["imported"], 0)
        self.assertEqual(second["skipped"], 1)
        with water_api.db() as conn:
            row = conn.execute("SELECT source_id,sensor_id,parameters_json FROM readings").fetchone()
            self.assertEqual(row["source_id"], "WQ-1")
            self.assertIsNone(row["sensor_id"])
            self.assertEqual(__import__("json").loads(row["parameters_json"])["ph"], 7.2)

    def test_invalid_coordinate_rows_are_reported_without_aborting_import(self):
        csv_text = (
            "sample_id,sample_date,city,state,latitude,longitude,pH\n"
            "bad,2024-08-01,Raipur,Chhattisgarh,91,81,7.1\n"
            "good,2024-08-02,Bhilai,Chhattisgarh,21,81,7.2\n"
        )
        result = water_api.import_csv(csv_text)
        self.assertEqual(result["imported"], 1)
        self.assertEqual(result["errors"][0]["row"], 2)
        self.assertEqual(result["errors"][0]["reason"], "Invalid latitude")

    def test_parameter_status_uses_available_dashboard_thresholds_only(self):
        assessed = water_api.calculate_status({"ph": 7.2, "eColi": 3})
        self.assertEqual(assessed["status"], "safe")
        self.assertNotIn("eColi", assessed["parameterStatus"])
        missing_threshold = water_api.calculate_status({"eColi": 3})
        self.assertEqual(missing_threshold["status"], "warning")
        self.assertIsNone(missing_threshold["overallScore"])

    def test_offline_transition_is_reported_and_last_reading_is_retained(self):
        old_seen = "2020-01-01T00:00:00Z"
        with water_api.db() as conn:
            conn.execute("INSERT INTO areas(id,name,normalized_name,created_at,updated_at) VALUES(?,?,?,?,?)", ("offline-area","Offline Area","offline area",water_api.now_iso(),water_api.now_iso()))
            conn.execute("INSERT INTO sensors(id,area_id,name,latitude,longitude,expected_interval_seconds,last_seen_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", ("offline-sensor","offline-area","Offline sensor",0,0,60,old_seen,water_api.now_iso(),water_api.now_iso()))
            water_api.insert_reading(conn,"offline-area","offline-sensor",old_seen,{"ph":7.0})
        water_api._known_sensor_online["offline-sensor"] = True
        with patch.object(water_api, "publish") as publish:
            water_api.check_sensor_status_once()
            event = publish.call_args.args[0]
        self.assertEqual(event["type"], "sensor_status")
        self.assertFalse(event["online"])
        self.assertEqual(event["lastSeenAt"], old_seen)
        with water_api.db() as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM readings WHERE sensor_id='offline-sensor'").fetchone()[0], 1)

    def test_area_history_is_scoped_and_chronological(self):
        with water_api.db() as conn:
            for area_id, name in (("a", "Area A"), ("b", "Area B")):
                conn.execute("INSERT INTO areas(id,name,normalized_name,created_at,updated_at) VALUES(?,?,?,?,?)", (area_id,name,name.casefold(),water_api.now_iso(),water_api.now_iso()))
                water_api.insert_reading(conn,area_id,None,"2024-08-02T00:00:00Z",{"ph":7.0},f"{area_id}-2")
                water_api.insert_reading(conn,area_id,None,"2024-08-01T00:00:00Z",{"ph":7.1},f"{area_id}-1")
        result = water_api._history_with_params(["area_id=?"],["a"],None,None,10,"ph")
        self.assertEqual(result["count"], 2)
        self.assertEqual([item["areaId"] for item in result["readings"]], ["a", "a"])
        self.assertEqual(result["readings"][0]["timestamp"], "2024-08-01T00:00:00Z")

    def test_http_import_sensor_ingest_scoping_and_map_flow(self):
        csv_text = (
            "sample_id,sample_date,city,state,latitude,longitude,pH,tds_mg_l\n"
            "WQ-A,2024-08-01,Raipur,Chhattisgarh,21.25,81.61,7.2,320\n"
            "WQ-B,2024-08-01,Bhilai,Chhattisgarh,21.20,81.34,6.2,920\n"
        )
        with patch.dict(os.environ, {"ADMIN_TOKEN":"test-admin", "INGEST_TOKEN":"test-ingest"}):
            with TestClient(service_app.app) as client:
                self.assertEqual(client.get("/health/live").status_code, 200)
                self.assertEqual(client.get("/health/ready").status_code, 200)
                self.assertEqual(client.post("/api/admin/import-readings", content=csv_text, headers={"X-Admin-Token":"wrong"}).status_code, 401)
                imported = client.post("/api/admin/import-readings", content=csv_text, headers={"X-Admin-Token":"test-admin", "Content-Type":"text/csv"})
                self.assertEqual(imported.json()["imported"], 2)
                areas = client.get("/api/areas").json()
                raipur = next(area for area in areas if area["name"] == "Raipur")
                bhilai = next(area for area in areas if area["name"] == "Bhilai")
                latest_raipur = client.get(f"/api/areas/{raipur['id']}/readings/latest").json()
                latest_bhilai = client.get(f"/api/areas/{bhilai['id']}/readings/latest").json()
                self.assertNotEqual(latest_raipur["parameters"]["tds"], latest_bhilai["parameters"]["tds"])
                map_areas = client.get("/api/map/locations").json()
                self.assertEqual(len(map_areas), 2)
                self.assertTrue(all(item["sensorId"] is None for item in map_areas))
                provisioned = client.post("/api/sensors", headers={"X-Admin-Token":"test-admin"}, json={
                    "id":"sensor-a", "areaId":raipur["id"], "name":"Raipur inlet", "latitude":21.25, "longitude":81.61
                })
                self.assertEqual(provisioned.status_code, 201)
                timestamp = datetime.now(timezone.utc).isoformat()
                reading = {"areaId":raipur["id"], "sensorId":"sensor-a", "timestamp":timestamp,"parameters":{"ph":7.1,"tds":300}}
                self.assertEqual(client.post("/api/readings", headers={"X-Ingest-Token":"test-ingest"}, json=reading).status_code, 201)
                self.assertEqual(client.post("/api/readings", headers={"X-Ingest-Token":"test-ingest"}, json=reading).status_code, 409)
                map_items = client.get("/api/map/locations").json()
                self.assertEqual(len(map_items), 2)
                sensor_location = next(item for item in map_items if item["sensorId"] == "sensor-a")
                self.assertEqual(sensor_location["areaId"], raipur["id"])
                self.assertTrue(sensor_location["online"])
                wrong_area = dict(reading, areaId=bhilai["id"], timestamp=datetime.now(timezone.utc).isoformat())
                mismatch = client.post("/api/readings", headers={"X-Ingest-Token":"test-ingest"}, json=wrong_area)
                self.assertEqual(mismatch.status_code, 422)


if __name__ == "__main__":
    unittest.main()
