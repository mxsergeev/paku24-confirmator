import React from 'react'
import { calculateAutomaticPricing } from '../../shared/orderPricing'
import FeeSelector from './FeeSelector'
import OriginalWordPressOrderDialog from './OriginalWordPressOrderDialog'
import PricingOverrideField from './PricingOverrideField'

export default function PricingEditor({ order, onChange }) {
  if (!order) return null

  const automatic = calculateAutomaticPricing(order)

  return (
    <div
      aria-label="Pricing"
      className="pricing-editor flex-item"
      style={{ width: '100%', marginTop: 5 }}
    >
      <PricingOverrideField
        order={order}
        component="price"
        automaticValue={automatic.price}
        label="Price estimate"
        name="price"
        onChange={onChange}
      />
      <FeeSelector order={order} onChange={onChange} />
      {order.originalOrder && <OriginalWordPressOrderDialog order={order.originalOrder} />}
    </div>
  )
}
