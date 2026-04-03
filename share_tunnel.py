import subprocess
import re
import sys

def start_cloudflare_tunnel(port):
    print(f"Starting Cloudflare tunnel for port {port}...")
    print("Waiting for Cloudflare to generate your free link...")
    
    # The command to start a token-free quick tunnel
    cmd = ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"]

    # We use stderr because cloudflared prints its logs there
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        url = None
        # Read the output line by line until we find the trycloudflare.com link
        for line in process.stderr:
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
            if match:
                url = match.group(0)
                break

        if url:
            print("\n" + "═"*60)
            print(" ✅ TUNNEL ESTABLISHED SUCCESSFULLY!")
            print(f" 🌐 Share this link with your friend: {url}")
            print("═"*60 + "\n")
            print("Press Ctrl+C to stop the tunnel and kill the link.")
            
            # Keep the script running so the tunnel stays open
            process.wait()
            
    except KeyboardInterrupt:
        print("\nClosing tunnel. The link is now dead.")
        process.terminate()
    except FileNotFoundError:
        print("\n❌ Error: 'cloudflared' is not installed or not in your system PATH.")
        print("Please install it first: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/")

if __name__ == "__main__":
    print("--- AI Chat Sharer ---")
    port_input = input("Which port do you want to share? (e.g., 3000 for frontend, 4000 for backend): ")
    
    try:
        port = int(port_input)
        start_cloudflare_tunnel(port)
    except ValueError:
        print("Please enter a valid number.")