'use client'

import { useEffect, useRef } from 'react';

interface SimpleCalendarProps {
  events: any[]
  onDateSelect?: (date: string) => void
  onEventClick?: (event: any) => void
}

export default function SimpleCalendar({ events, onDateSelect, onEventClick }: SimpleCalendarProps) {
  const calendarRef = useRef<HTMLDivElement>(null)
  const fullCalendarRef = useRef<any>(null)

  useEffect(() => {
    // Cargar FullCalendar dinámicamente solo en el cliente
    const loadFullCalendar = async () => {
      try {
        const [
          { default: FullCalendar },
          { default: dayGridPlugin },
          { default: timeGridPlugin },
          { default: interactionPlugin },
          { default: listPlugin },
          { default: esLocale }
        ] = await Promise.all([
          import('@fullcalendar/react'),
          import('@fullcalendar/daygrid'),
          import('@fullcalendar/timegrid'),
          import('@fullcalendar/interaction'),
          import('@fullcalendar/list'),
          import('@fullcalendar/core/locales/es')
        ])

        if (calendarRef.current && !fullCalendarRef.current) {
          const { createRoot } = await import('react-dom/client')

          const root = createRoot(calendarRef.current)

          const CalendarComponent = () => (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <style jsx global>{`
                .fc {
                  font-family: Arial, Helvetica, sans-serif;
                }
                .fc .fc-toolbar-title {
                  font-size: 1.75rem;
                  font-weight: bold;
                  color: #1f2937;
                }
                .fc .fc-button {
                  background-color: #3b82f6;
                  border-color: #3b82f6;
                  color: white;
                  text-transform: capitalize;
                  padding: 0.5rem 1rem;
                  font-weight: 500;
                }
                .fc .fc-button:hover {
                  background-color: #2563eb;
                  border-color: #2563eb;
                }
                .fc .fc-daygrid-day.fc-day-today {
                  background-color: #dbeafe !important;
                }
                .fc .fc-event {
                  border-radius: 4px;
                  padding: 2px 4px;
                  border: none;
                  cursor: pointer;
                  transition: transform 0.2s;
                }
                .fc .fc-event:hover {
                  transform: scale(1.02);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .fc-event-video {
                  background-color: #3b82f6 !important;
                  border-left: 4px solid #1e40af !important;
                }
                .fc-event-image {
                  background-color: #8b5cf6 !important;
                  border-left: 4px solid #6d28d9 !important;
                }
                .fc-event-post {
                  background-color: #10b981 !important;
                  border-left: 4px solid #047857 !important;
                }
              `}</style>

              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                locale={esLocale}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                }}
                buttonText={{
                  today: 'Hoy',
                  month: 'Mes',
                  week: 'Semana',
                  day: 'Día',
                  list: 'Lista'
                }}
                events={events}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                select={(selectInfo) => {
                  if (onDateSelect) {
                    const dateStr = selectInfo.startStr.split('T')[0]
                    onDateSelect(dateStr)
                  }
                }}
                eventClick={(clickInfo) => {
                  if (onEventClick) {
                    onEventClick(clickInfo.event)
                  }
                }}
                height="auto"
                aspectRatio={1.8}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                expandRows={true}
                nowIndicator={true}
              />
            </div>
          )

          root.render(<CalendarComponent />)
          fullCalendarRef.current = root
        }
      } catch (error) {
        console.error('Error loading FullCalendar:', error)
      }
    }

    loadFullCalendar()

    // Cleanup
    return () => {
      if (fullCalendarRef.current) {
        fullCalendarRef.current.unmount()
        fullCalendarRef.current = null
      }
    }
  }, [events, onDateSelect, onEventClick])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando calendario...</p>
      </div>
      <div ref={calendarRef} />
    </div>
  )
}
