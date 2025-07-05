from passlib.hash import sha512_crypt
import sys
import json

def check_password(password, stored_hash):
    try:
        return sha512_crypt.verify(password, stored_hash)
    except Exception as e:
        print(f"Error verifying password: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":    
    try:
        # Leer entrada como JSON desde stdin
        data = json.load(sys.stdin)
        password = data['password']
        stored_hash = data['stored_hash']
        
        if check_password(password, stored_hash):
            print("OK")
        else:
            print("FAIL")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        print("FAIL")