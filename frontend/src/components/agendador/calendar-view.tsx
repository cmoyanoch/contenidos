'use client'

import { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';

interface CalendarViewProps {
  events: EventInput[]
  onDateSelect?: (selectInfo: DateSelectArg) => void
  onEventClick?: (clickInfo: EventClickArg) => void
  onEventDrop?: (info: any) => void
  onEventResize?: (info: any) => void
}

export default function CalendarView({
  events,
  onDateSelect,
  onEventClick,
  onEventDrop,
  onEventResize
}: CalendarViewProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <style jsx global>{`
        /* FullCalendar Custom Styles */
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

        .fc .fc-button-primary:not(:disabled):active,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }

        .fc .fc-button:disabled {
          opacity: 0.5;
          background-color: #9ca3af;
          border-color: #9ca3af;
        }

        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: #e5e7eb;
        }

        .fc .fc-daygrid-day-number {
          color: #374151;
          font-weight: 500;
        }

        .fc .fc-col-header-cell-cushion {
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
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

        .fc .fc-event-title {
          font-weight: 500;
        }

        /* Event colors by type */
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

        /* Status colors */
        .fc-event-scheduled {
          opacity: 1;
        }

        .fc-event-pending {
          opacity: 0.7;
        }

        .fc-event-published {
          opacity: 0.5;
          text-decoration: line-through;
        }

        .fc-event-failed {
          background-color: #ef4444 !important;
          border-left: 4px solid #b91c1c !important;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .fc .fc-toolbar {
            flex-direction: column;
            gap: 0.5rem;
          }

          .fc .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
          }
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
        select={onDateSelect}
        eventClick={onEventClick}
        eventDrop={onEventDrop}
        eventResize={onEventResize}
        height="auto"
        contentHeight="auto"
        aspectRatio={1.8}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        expandRows={true}
        stickyHeaderDates={true}
        nowIndicator={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
        allDaySlot={false}
        eventDisplay="block"
        eventBackgroundColor="#3b82f6"
        eventBorderColor="#3b82f6"
      />
    </div>
  )
}
