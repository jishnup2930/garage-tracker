import { forwardRef, type SelectHTMLAttributes } from 'react'
import { Select } from '../../components/ui/Field'
import { useGarage } from '../../store/AppStore'

export const VehicleSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function VehicleSelect(p, ref) {
  const { data } = useGarage()
  return (
    <Select ref={ref} {...p}>
      <option value="" disabled>
        Choose a vehicle
      </option>
      {data.vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.nickname} ({v.brand} {v.model})
        </option>
      ))}
    </Select>
  )
})
