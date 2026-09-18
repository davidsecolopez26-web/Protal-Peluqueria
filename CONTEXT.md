# Portal Peluquería

Sistema de gestión de citas para una peluquería. Los clientes reservan citas online sin necesidad de login. El peluquero gestiona la disponibilidad, servicios y confirma/modifica citas desde un panel administrativo protegido.

## Language

**Appointment** (Cita)
Una reserva de tiempo en el calendario para que un cliente reciba servicios. Incluye la fecha, hora de inicio, servicios solicitados, datos del cliente y estado (pending, confirmed, cancelled).
_Avoid_: booking, reservation, session

**Service** (Servicio)
Un tipo de trabajo que la peluquería ofrece (corte, color, tratamiento, etc.). Cada servicio tiene una duración en minutos establecida por el peluquero.
_Avoid_: treatment, procedure, task

**Client** (Cliente)
Una persona que reserva una cita. Se identifica por nombre y número de teléfono. No requiere login.
_Avoid_: customer, user, account

**Availability** (Disponibilidad)
Los horarios en los que el peluquero puede atender citas. Se define como plantilla anual (ej: lunes-viernes 9:00-18:00) y puede tener excepciones en días específicos.
_Avoid_: schedule, opening hours, slots

**Time Slot** (Franja horaria)
Un intervalo de tiempo disponible en una fecha específica. Se calcula restando duraciones de servicios de la disponibilidad general.
_Avoid_: slot, time window, opening

**Appointment Status** (Estado de cita)
El estado de una cita en su ciclo de vida:
- **pending**: el cliente ha reservado pero el peluquero no ha confirmado
- **confirmed**: el peluquero ha aprobado la cita
- **cancelled**: la cita ha sido anulada

_Avoid_: stage, phase

**Access Token** (Token de acceso a cita)
Un identificador único y secret que genera el sistema al crear una cita. Permite al cliente ver y rastrear su cita sin login. Se envía por WhatsApp y es accesible vía URL única.
_Avoid_: link, code, reference

**Admin Panel** (Panel administrativo)
Interfaz protegida con login donde el peluquero gestiona: disponibilidad anual, servicios, citas (confirmar/modificar/cancelar) y ve notificaciones de nuevas reservas.
_Avoid_: dashboard, backoffice, management area