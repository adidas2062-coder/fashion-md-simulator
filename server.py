import http.server
import socketserver
import urllib.parse
import json
import os

PORT = 8000

class MDSimulatorHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # URL 쿼리 파라미터 파싱
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)
        
        if path == '/api/generate-request':
            prompt = query.get('prompt', [''])[0]
            # 터미널 표준 출력으로 리퀘스트 표시 (에이전트 감지용)
            print(f"\n[AI_IMAGE_REQUEST] Prompt: {prompt}\n", flush=True)
            
            # 리퀘스트 기록용 파일 저장
            os.makedirs('src/assets', exist_ok=True)
            with open('src/assets/ai_request.txt', 'w', encoding='utf-8') as f:
                f.write(prompt)
                
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"status": "requested", "prompt": prompt}
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            # 정적 파일 서빙
            super().do_GET()

# 스크립트 실행 위치로 현재 작업 디렉토리 변경
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 포트가 사용 중일 때 재사용 가능하도록 설정
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), MDSimulatorHandler) as httpd:
    print(f"Fashion MD Simulator server running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
