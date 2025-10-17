// Declaración de tipos para react-big-calendar
declare module 'react-big-calendar' {
  import { ComponentType } from 'react';

  export interface Event {
    title: string
    start: Date
    end: Date
    resource?: unknown
    allDay?: boolean
  }

  export interface CalendarProps {
    localizer: unknown
    events: Event[]
    startAccessor?: string | ((event: Event) => Date)
    endAccessor?: string | ((event: Event) => Date)
    style?: React.CSSProperties
    onSelectEvent?: (event: Event) => void
    onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
    selectable?: boolean
    views?: string[]
    defaultView?: string
    components?: unknown
    eventPropGetter?: (event: Event) => Record<string, unknown>
    popup?: boolean
    popupOffset?: { x: number; y: number }
    showMultiDayTimes?: boolean
    messages?: Record<string, unknown>
    [key: string]: unknown // Allow any other props
  }

  export const Calendar: ComponentType<CalendarProps>
  export function momentLocalizer(moment: unknown): unknown
  export function globalizeLocalizer(globalize: unknown): unknown
  export function dateFnsLocalizer(config: unknown): unknown
}
