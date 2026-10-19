import type { Metadata } from 'next';
import { Card, RoomLegend, RoomTile } from '@/components/rooms';
import { requireSession } from '@/server/auth';
import { listRooms } from '@/server/dal/rooms';

export const metadata: Metadata = { title: 'ห้องพัก' };

export default async function RoomsPage() {
  const session = await requireSession();
  const rooms = await listRooms(session);
  const floors = [4, 3, 2, 1];
  return (
    <>
      <header>
        <p className="text-sm text-muted">{session.building}</p>
        <h1 className="font-display text-2xl font-medium">ห้องพักทั้งหมด</h1>
      </header>
      {floors.map(floor => {
        const list = rooms.filter(r => r.floor === floor);
        return (
          <Card key={floor} title={`ชั้น ${floor}`} subtitle={`มีผู้เช่า ${list.filter(r => r.total !== null).length}/16 ห้อง`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {list.map(room => <RoomTile key={room.no} room={room} />)}
            </div>
          </Card>
        );
      })}
      <RoomLegend />
    </>
  );
}
