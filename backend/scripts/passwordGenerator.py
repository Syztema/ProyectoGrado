#!/usr/bin/env python3
from passlib.hash import sha512_crypt
import sys
import json

def generate_moodle_password(password):
    """
    Genera un hash de contraseña compatible con Moodle usando SHA-512 crypt
    con 10000 rondas (el estándar de Moodle).
    """
    try:
        # Usar el mismo formato que Moodle: SHA-512 con 10000 rondas
        hash_value = sha512_crypt.using(rounds=10000).hash(password)
        return hash_value
    except Exception as e:
        print(f"Error generando hash: {str(e)}", file=sys.stderr)
        return None

if __name__ == "__main__":  
    try:
        # Leer entrada como JSON desde stdin
        data = json.load(sys.stdin)
        password = data.get('password')
        
        if not password:
            print(json.dumps({"error": "Password is required"}))
            sys.exit(1)
            
        hash_value = generate_moodle_password(password)
        
        if hash_value:
            print(json.dumps({"hash": hash_value}))
        else:
            print(json.dumps({"error": "Failed to generate hash"}))
            
    except Exception as e:
        print(json.dumps({"error": f"Error: {str(e)}"}))
        sys.exit(1)