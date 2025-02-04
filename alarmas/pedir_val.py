import pyodbc
import datetime

# Configura la conexión a la base de datos
connection_string = (
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=localhost;'
    'DATABASE=Sismova;'
    'Trusted_Connection=yes;'
)

# Función para insertar datos en un rango de ID_Sensor
def insertar_datos_rango(id_sensor_inicio, id_sensor_fin):
    # Crea una conexión
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()

    while True:
        try:
            # Solicitar al usuario que ingrese un valor
            valor_actual = input(f"Ingrese el valor para los sensores desde {id_sensor_inicio} hasta {id_sensor_fin} (o 'salir' para terminar): ")

            # Verificar si el usuario quiere salir
            if valor_actual.lower() == 'salir':
                print("Saliendo del modo de inserción de datos...")
                break

            # Convertir el valor a entero
            valor_actual = int(valor_actual)

            # Obtener la fecha y hora actual
            fecha_actual = datetime.date.today()
            hora_actual = datetime.datetime.now().time()

            # Insertar el valor para cada sensor en el rango
            for id_sensor in range(id_sensor_inicio, id_sensor_fin + 1):
                cursor.execute("INSERT INTO DatosDeSensores (ID_Sensor, Valor, Fecha, Hora) VALUES (?, ?, ?, ?)",
                               id_sensor, valor_actual, fecha_actual, hora_actual)
                conn.commit()
                print(f"Datos insertados - ID_Sensor: {id_sensor}, Valor: {valor_actual}, Fecha: {fecha_actual}, Hora: {hora_actual}")

        except ValueError:
            print("Error: Debes ingresar un número válido.")
        except Exception as e:
            print(f"Error al insertar datos: {e}")

    # Cierra la conexión al salir
    conn.close()
    print(f"Conexión cerrada.")

# Solicitar al usuario que ingrese el rango de ID_Sensor
try:    
    id_sensor_inicio = int(input("Ingrese el ID de inicio del rango de sensores: "))
    id_sensor_fin = int(input("Ingrese el ID de fin del rango de sensores: "))
    
    if id_sensor_inicio > id_sensor_fin:
        print("Error: El ID de inicio no puede ser mayor que el ID de fin.")
    else:
        insertar_datos_rango(id_sensor_inicio, id_sensor_fin)

except ValueError:
    print("Error: Debes ingresar un número válido para los ID de sensores.")
