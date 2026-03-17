from flask import Flask, render_template
from app.core.config import Config
from app.core.firebase_client import FirebaseClient
from app.core.s3_client import S3Client

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize clients with error handling
    try:
        FirebaseClient.get_instance()
    except Exception as e:
        print(f"FAILED TO CONNECT FIREBASE: {e}")

    try:
        S3Client.get_client()
    except Exception as e:
        print(f"FAILED TO CONNECT S3: {e}")

    @app.after_request
    def add_security_headers(response):
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        return response

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/get_ai_settings', methods=['GET'])
    def ai_settings():
        from app.services.ai_service import AIService
        return AIService.get_settings()

    # Register Blueprints (Routes)
    from app.routes.product_routes import product_bp
    app.register_blueprint(product_bp, url_prefix='/api')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
