import React from 'react'
import { getOrderPricing } from '../../shared/orderPricing'
import FeeSelector from './FeeSelector'
import OriginalWordPressOrderDialog from './OriginalWordPressOrderDialog'
import PricingOverrideField from './PricingOverrideField'

export default function PricingEditor({ order, onChange }) {
  if (!order) return null

  const effective = getOrderPricing(order)

  return (
    <div
      aria-label="Pricing"
      className="pricing-editor flex-item"
      style={{ width: '100%', marginTop: 5 }}
    >
      <PricingOverrideField
        order={order}
        component="price"
        automaticValue={effective.price}
        label="Price estimate"
        name="price"
        onChange={onChange}
      />
      <FeeSelector order={order} onChange={onChange} />
      {order.originalOrder && <OriginalWordPressOrderDialog order={order.originalOrder} />}
    </div>
  )
}
