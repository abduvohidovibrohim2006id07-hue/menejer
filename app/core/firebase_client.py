import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from .config import Config

class FirebaseClient:
    _instance = None
    _db = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            try:
                if not firebase_admin._apps:
                    firebase_key_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-key.json')
                    
                    if os.path.exists(firebase_key_path):
                        cred = credentials.Certificate(firebase_key_path)
                        firebase_admin.initialize_app(cred)
                    elif Config.FIREBASE_SERVICE_ACCOUNT:
                        cred_dict = json.loads(Config.FIREBASE_SERVICE_ACCOUNT)
                        cred = credentials.Certificate(cred_dict)
                        firebase_admin.initialize_app(cred)
                    else:
                        print("WARNING: Firebase credentials not found!")
                        return None
                
                cls._instance = firebase_admin.get_app()
                cls._db = firestore.client()
                print("Firebase successfully initialized.")
            except Exception as e:
                print(f"CRITICAL: Firebase initialization failed: {e}")
                return None
        return cls._instance

    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls.get_instance()
        if cls._db is None:
            raise ConnectionError("Firebase connection could not be established.")
        return cls._db
