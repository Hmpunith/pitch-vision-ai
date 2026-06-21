import unittest
import os
import sys
import time
from pydantic import ValidationError

# Add backend directory to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import (
    VectorPoint,
    VectorSketch,
    AnalyzePlayRequest,
    VARExplainRequest,
    ChatRequest,
    check_rate_limit,
    ip_request_history
)
from granite_client import granite

class TestPitchVisionBackend(unittest.TestCase):

    def setUp(self):
        # Reset rate limiting history before each test
        ip_request_history.clear()

    # 1. VectorPoint validations
    def test_vector_point_validation_valid(self):
        point = VectorPoint(x=10.5, y=20.0, z=1.5)
        self.assertEqual(point.x, 10.5)
        self.assertEqual(point.y, 20.0)
        self.assertEqual(point.z, 1.5)

    def test_vector_point_validation_defaults(self):
        point = VectorPoint(x=5.0, y=-2.5)
        self.assertEqual(point.x, 5.0)
        self.assertEqual(point.y, -2.5)
        self.assertEqual(point.z, 0.0)

    def test_vector_point_validation_invalid(self):
        with self.assertRaises(ValidationError):
            # Missing y coordinate
            VectorPoint(x=10.0)

    # 2. VectorSketch validations
    def test_vector_sketch_validation_valid(self):
        sketch = VectorSketch(
            type="run",
            points=[VectorPoint(x=0.0, y=0.0), VectorPoint(x=10.0, y=10.0)]
        )
        self.assertEqual(sketch.type, "run")
        self.assertEqual(len(sketch.points), 2)

    def test_vector_sketch_validation_invalid_type(self):
        with self.assertRaises(ValidationError):
            # Points is not a list
            VectorSketch(type="pass", points="not-a-list")

    # 3. AnalyzePlayRequest validations
    def test_analyze_play_request_valid(self):
        req = AnalyzePlayRequest(
            vectors=[
                VectorSketch(type="run", points=[VectorPoint(x=1.0, y=2.0), VectorPoint(x=3.0, y=4.0)])
            ],
            camera="tactical",
            match_time="82:14"
        )
        self.assertEqual(req.camera, "tactical")
        self.assertEqual(len(req.vectors), 1)

    def test_analyze_play_request_invalid_vectors(self):
        with self.assertRaises(ValidationError):
            # vectors contains string instead of VectorSketch
            AnalyzePlayRequest(vectors=["invalid-vector"])

    # 4. VARExplainRequest validations
    def test_var_explain_request_valid(self):
        req = VARExplainRequest(
            decision_type="offside",
            parameters={"px_delta": -12, "offset_cm": -5.4}
        )
        self.assertEqual(req.decision_type, "offside")
        self.assertEqual(req.parameters["px_delta"], -12)

    def test_var_explain_request_invalid(self):
        with self.assertRaises(ValidationError):
            # Missing parameters dict
            VARExplainRequest(decision_type="handball")

    # 5. ChatRequest validations
    def test_chat_request_valid(self):
        req = ChatRequest(query="Explain team block")
        self.assertEqual(req.query, "Explain team block")
        self.assertEqual(req.mode, "tactical")

    def test_chat_request_too_long(self):
        with self.assertRaises(ValidationError):
            # Query exceeds 1000 character limit
            ChatRequest(query="a" * 1001)

    # 6. Rate Limiting Tests
    def test_rate_limiter_under_limit(self):
        ip = "127.0.0.1"
        for _ in range(5):
            res = check_rate_limit(ip)
            self.assertTrue(res)

    def test_rate_limiter_over_limit(self):
        ip = "192.168.1.1"
        # Force fill history to exceed limit
        ip_request_history[ip] = [time.time()] * 60
        res = check_rate_limit(ip)
        self.assertFalse(res)

    # 7. Granite System Prompts & Context Insertion
    def test_granite_client_default_prompt(self):
        prompt = granite.get_system_prompt("tactical", None)
        self.assertIn("Argentina and France", prompt)

    def test_granite_client_dynamic_prompt(self):
        context = {
            "match_name": "El Clasico 2024",
            "home_team": "Real Madrid",
            "away_team": "Barcelona",
            "stadium": "Santiago Bernabeu",
            "score": "3-2",
            "match_time": "91:15"
        }
        prompt = granite.get_system_prompt("tactical", context)
        self.assertIn("Real Madrid", prompt)
        self.assertIn("Barcelona", prompt)
        self.assertIn("Santiago Bernabeu", prompt)
        self.assertIn("91:15", prompt)

    # 8. Granite Fallback Response logic
    def test_granite_fallback_mapping(self):
        resp = granite._generate_fallback("Explain the Mbappe volley gap", "tactical", "en", "coach")
        self.assertIn("Mbappé", resp)
        self.assertIn("Rabiot's cross-field target", resp)

    def test_granite_fallback_languages(self):
        resp_es = granite._generate_fallback("Mbappe volley gap", "tactical", "es", "coach")
        self.assertIn("Mbappé", resp_es)
        self.assertIn("Entrenador", resp_es)

        resp_fr = granite._generate_fallback("Mbappe volley gap", "tactical", "fr", "coach")
        self.assertIn("Entraîneur", resp_fr)

    def test_granite_fallback_var_educational(self):
        resp = granite._generate_fallback("check offside Law 11", "var", "en", "ref")
        self.assertIn("IFAB Law 11/12", resp)
        self.assertIn("sub-pixel", resp)

if __name__ == "__main__":
    unittest.main()
