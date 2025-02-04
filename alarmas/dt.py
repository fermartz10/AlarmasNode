import pyodbc
import datetime
import random
import time
import threading

# Configura la conexión a la base de datos
server = 'localhost'
database = 'sismova'  # Cambia 'prueba' por el nombre de tu base de datos

# Database connection details
connection_string = (
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=localhost;'
    'DATABASE=Sismova;'
    'Trusted_Connection=yes;'
)

# Función para insertar datos
def insertar_datos(id_sensor):
    # Crea una conexión
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()

    while True:
        fecha_actual = datetime.date.today()
        hora_actual = datetime.datetime.now().time()

        # Genera un valor aleatorio en el rango de 0 a 30
        valor_actual = random.randint(0, 25)

        cursor.execute("INSERT INTO DatosDeSensores (ID_Sensor, Valor, Fecha, Hora) VALUES (?, ?, ?, ?)",
                       id_sensor, valor_actual, fecha_actual, hora_actual)
        conn.commit()
        print(f"Datos insertados - ID_Sensor: {id_sensor}, Valor: {valor_actual}, Fecha: {fecha_actual}, Hora: {hora_actual}")

        time.sleep(10)  # Espera 60 segundos antes de la siguiente inserción

    # Cierra la conexión
    conn.close()

# Lista de IDs de sensores
sensor_ids = list(range(1, 5))  # Cambia el rango para incluir los sensores del 1 al 10

# Crear y iniciar hilos para cada sensor
threads = []
for sensor_id in sensor_ids:
    thread = threading.Thread(target=insertar_datos, args=(sensor_id,))
    threads.append(thread)
    thread.start()

# Esperar a que todos los hilos terminen
for thread in threads:
    thread.join()

print("Inserción de datos en paralelo completada.")
