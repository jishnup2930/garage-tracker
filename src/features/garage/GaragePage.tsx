import { useMemo, useState } from 'react'
import { Plus, Warehouse } from 'lucide-react'
import { useGarage } from '../../store/AppStore'
import { useUI } from '../../store/ui'
import { PageHeader } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/EmptyState'
import { VehicleCard } from './VehicleCard'
import { useVehicleSummaries } from './summary'
import { VehicleDetail } from './VehicleDetail'
import { urgency } from '../../lib/calc'

type Sort = 'name' | 'spend' | 'attention' | 'recent'

export function GaragePage({ id }: { id?: string }) {
  if (id) return <VehicleDetail id={id} />
  return <GarageList />
}

function GarageList() {
  const { data } = useGarage()
  const { openForm } = useUI()
  const summaries = useVehicleSummaries()
  const [sort, setSort] = useState<Sort>('attention')
  const vehicles = useMemo(() => {
    const vs = [...data.vehicles]
    const s = (id: string) => summaries.get(id)
    if (sort === 'name') vs.sort((a, b) => a.nickname.localeCompare(b.nickname))
    if (sort === 'spend') vs.sort((a, b) => (s(b.id)?.total ?? 0) - (s(a.id)?.total ?? 0))
    if (sort === 'recent') vs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sort === 'attention') vs.sort((a, b) => (s(a.id)?.next ? urgency(s(a.id)!.next!.eval) : 1e9) - (s(b.id)?.next ? urgency(s(b.id)!.next!.eval) : 1e9))
    return vs
  }, [data.vehicles, summaries, sort])

  return (
    <>
      <PageHeader
        title="My Garage"
        subtitle={data.vehicles.length ? `${data.vehicles.length} ${data.vehicles.length === 1 ? 'vehicle' : 'vehicles'}, each with its own history, costs and schedule.` : undefined}
        actions={
          <>
            {data.vehicles.length > 1 && (
              <div className="w-44">
                <Select aria-label="Sort vehicles" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10">
                  <option value="attention">Needs attention</option>
                  <option value="spend">Most spent</option>
                  <option value="name">Name</option>
                  <option value="recent">Recently added</option>
                </Select>
              </div>
            )}
            <Button icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => openForm({ kind: 'vehicle' })}>
              Add vehicle
            </Button>
          </>
        }
      />
      {vehicles.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} summary={summaries.get(v.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-line">
          <EmptyState
            icon={Warehouse}
            title="Your garage is waiting for its first vehicle"
            message="Add a car, bike or anything with an odometer. You can log services, refills and costs against it straight away."
            action={<Button onClick={() => openForm({ kind: 'vehicle' })}>Add your first vehicle</Button>}
          />
        </div>
      )}
    </>
  )
}
