export type RouteStop = {
  id: string;
  label: string;
  address: string;
  dropType: '@mailbox' | '@house';
  note: string;
  position: { x: number; y: number };
  sequence: number;
  eta: string;
  travelMinutes: number;
};

export const stewartRouteStops: RouteStop[] = [
  {
    id: 'stewart-po',
    label: 'Stewart Post Office',
    address: '707 Hall St, Stewart, MN',
    dropType: '@mailbox',
    note: 'Dispatch & return hub',
    position: { x: 8, y: 12 },
    sequence: 1,
    eta: '8:05 AM',
    travelMinutes: 0,
  },
  {
    id: 'cedar-312',
    label: '312 Cedar Ave',
    address: 'Mailbox delivery',
    dropType: '@mailbox',
    note: 'Locking box on right-hand side',
    position: { x: 26, y: 32 },
    sequence: 2,
    eta: '8:25 AM',
    travelMinutes: 6,
  },
  {
    id: 'prairie-98',
    label: '98 Prairie View Rd',
    address: 'Front porch bench',
    dropType: '@house',
    note: 'Right-hand drop, avoid storm door',
    position: { x: 52, y: 44 },
    sequence: 3,
    eta: '8:42 AM',
    travelMinutes: 10,
  },
  {
    id: 'sunrise-141',
    label: '141 Sunrise Cir',
    address: 'Garage-side drop',
    dropType: '@house',
    note: 'Dog on premises; knock',
    position: { x: 76, y: 58 },
    sequence: 4,
    eta: '9:03 AM',
    travelMinutes: 9,
  },
  {
    id: 'return',
    label: 'Return to Stewart PO',
    address: 'End of tour',
    dropType: '@mailbox',
    note: 'Auto-report to supervisors',
    position: { x: 90, y: 80 },
    sequence: 5,
    eta: '9:25 AM',
    travelMinutes: 11,
  },
];

export const routeHealth = {
  duration: '1 hr 20 min',
  distance: '6.4 mi',
  compliance: 'Right-hand delivery, no backtracking',
  supervisor: 'Auto-submit reports on arrival back to 707 Hall St',
};
