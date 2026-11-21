# Reemplazar calculadora del cliente y retirar miniaturas de estados

1. En Supabase > SQL Editor > New query, pega todo el contenido de migraciones/018_calculadora_mpi.sql y pulsa Run. Es el instalador incluido en el ZIP recibido: crea las dos tablas propias del modulo, sin borrar los productos, videos, estados ni cuentas existentes. Basta instalarlo una vez. No corresponde a Edge Functions.
2. Sube la carpeta frontend y la carpeta migraciones del paquete a la raiz del repositorio de GitHub, conservando las rutas. El archivo de instrucciones es opcional para GitHub.
3. Titulo: Reemplazar calculadora del cliente y quitar miniaturas
4. Espera Actions en verde y recarga la pagina con Ctrl+F5. Abre CALCULADORA o el boton de calcular: se abre la nueva version recibida. Cerrar y volver a la pagina regresa a la tienda.
5. En Nuestros estados queda solamente el leon y el nombre. Al pulsar el leon se conservan el visor, los estados y sus controles.

El archivo frontend/calculadora-mpi/Calculadora_Mega_Prime_Unificada.html conserva exactamente los bytes del HTML original recibido. No se cambian sus formulas, diseno ni funciones. Solo se configuro conexion.json con la URL y clave publicable del proyecto existente, y se conectaron los accesos publicos mediante un adaptador externo. La calculadora interna del panel anterior permanece intacta, ya que se solicito reemplazar la del cliente.

El modulo nuevo tiene configuracion propia en Supabase. Consultarla es publico; editarla exige autorizar expresamente a una cuenta en mpi_materiales_admin, como explica el LEEME del ZIP original. Este paquete no concede nuevos permisos a usuarios ni inserta contrasenas. El Word privado permanece intacto.
