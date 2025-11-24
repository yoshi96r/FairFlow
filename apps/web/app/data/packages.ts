export type Package = {
  id: string;
  address: string;
  preference: '@mailbox' | '@house';
  instructions: string;
  status: 'Pending' | 'Out for delivery' | 'Delivered';
  photoHint: string;
};

export const packageSeed: Package[] = [
  {
    id: '9405 5036 9934 8350 1234',
    address: '312 Cedar Ave',
    preference: '@mailbox',
    instructions: 'Slide small parcels inside locking mailbox.',
    status: 'Out for delivery',
    photoHint:
      'url("https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80")',
  },
  {
    id: '420 749 9999 0123',
    address: '98 Prairie View Rd',
    preference: '@house',
    instructions: 'Leave at front porch bench; avoid blocking storm door.',
    status: 'Pending',
    photoHint: 'url("https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80")',
  },
  {
    id: '9274 8901 2300 1123',
    address: '141 Sunrise Cir',
    preference: '@house',
    instructions: 'Customer requests side garage drop; dog on premises.',
    status: 'Delivered',
    photoHint: 'url("https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80")',
  },
];
