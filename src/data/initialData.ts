import { EventConfig } from '../types';
import { generateEventId } from '../utils/eventSession';

export const INITIAL_EVENT_CONFIG: EventConfig = {
  eventId: generateEventId(),
  eventName: '',
  boothNumber: '',
  cashierName: '',
  location: '',
  startDate: '',
  endDate: '',
  currencySymbol: 'RM',
  currencyCode: 'MYR',
  openingCashFloat: 0,
  taxPercent: 0,
  soundEffectsEnabled: true,
};
