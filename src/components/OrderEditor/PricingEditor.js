import React, { useEffect, useState } from 'react'
import { getAvailableFees } from '../../shared/fees'
import {
  calculateAutomaticPricing,
  clearPricingOverride,
  getOrderPricing,
  setPricingOverride,
} from '../../shared/orderPricing'
import OriginalWordPressOrderDialog from './OriginalWordPressOrderDialog'

function formatMoney(value) {
  return `${value ?? 0} €`
}

function formatFees(value) {
  if (!Array.isArray(value) || value.length === 0) return 'None'
  return value.map((fee) => `${fee.label || fee.name} (${fee.amount} €)`).join(', ')
}

function isNumber(value) {
  return value.trim() !== '' && Number.isFinite(Number(value))
}

function NumericPricingRow({ order, component, automaticValue, effectiveValue, onChange }) {
  const { key, label, inputLabel } = component
  const manualValue = order.pricingOverrides?.[key]
  const [inputValue, setInputValue] = useState(
    manualValue == null ? '' : String(manualValue),
  )

  useEffect(() => {
    setInputValue(manualValue == null ? '' : String(manualValue))
  }, [manualValue])

  function commitInput(event) {
    if (event?.relatedTarget?.dataset?.pricingAction) return

    if (inputValue.trim() === '') {
      onChange(clearPricingOverride(order, key))
      return
    }

    const value = Number(inputValue)
    if (Number.isFinite(value)) {
      onChange(setPricingOverride(order, key, value))
    }
  }

  function useManual() {
    commitInput()
  }

  function useAutomatic() {
    setInputValue('')
    onChange(clearPricingOverride(order, key))
  }

  return (
    <section aria-labelledby={`${key}-pricing-title`} className="pricing-comparison-row">
      <h3 id={`${key}-pricing-title`}>{label}</h3>
      <p>Automatic: {formatMoney(automaticValue)}</p>
      <label>
        {inputLabel}
        <input
          aria-label={inputLabel}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onBlur={commitInput}
        />
      </label>
      <p>
        Effective: <strong>{formatMoney(effectiveValue)}</strong>
      </p>
      <div className="pricing-comparison-actions">
        <button type="button" data-pricing-action="true" onClick={useAutomatic}>
          Use automatic
        </button>
        <button
          type="button"
          data-pricing-action="true"
          disabled={!isNumber(inputValue)}
          onClick={useManual}
        >
          Use manual override
        </button>
      </div>
    </section>
  )
}

function FeesPricingRow({ order, automaticValue, effectiveValue, onChange }) {
  const manualValue = order.pricingOverrides?.fees
  const manualFees = Array.isArray(manualValue) ? manualValue : automaticValue
  const configuredFees = getAvailableFees(order)
  const configuredNames = new Set(configuredFees.map((fee) => fee.name))
  const existingManualFees = Array.isArray(manualValue)
    ? manualValue.filter((fee) => !configuredNames.has(fee.name))
    : []
  const availableFees = configuredFees.concat(existingManualFees)

  function useAutomatic() {
    onChange(clearPricingOverride(order, 'fees'))
  }

  function useManual() {
    onChange(setPricingOverride(order, 'fees', manualFees))
  }

  return (
    <section aria-labelledby="fees-pricing-title" className="pricing-comparison-row">
      <h3 id="fees-pricing-title">Fees</h3>
      <p>Automatic: {formatFees(automaticValue)}</p>
      <div>
        {availableFees.map((fee) => {
          const selected = manualFees.some((item) => item.name === fee.name)
          return (
            <label key={fee.name}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {
                  const nextFees = selected
                    ? manualFees.filter((item) => item.name !== fee.name)
                    : manualFees.concat(fee)
                  onChange(setPricingOverride(order, 'fees', nextFees))
                }}
                aria-label={`Manual ${fee.label || fee.name} fee`}
              />
              {`${fee.label || fee.name} (${fee.amount} €)`}
            </label>
          )
        })}
      </div>
      <p>
        Effective: <strong>{formatFees(effectiveValue)}</strong>
      </p>
      <div className="pricing-comparison-actions">
        <button type="button" onClick={useAutomatic}>
          Use automatic
        </button>
        <button type="button" onClick={useManual}>
          Use manual override
        </button>
      </div>
    </section>
  )
}

export default function PricingEditor({ order, onChange }) {
  if (!order) return null

  const automatic = calculateAutomaticPricing(order)
  const effective = getOrderPricing(order)

  return (
    <div className="pricing-comparison" aria-label="Pricing">
      <NumericPricingRow
        order={order}
        component={{ key: 'price', label: 'Price', inputLabel: 'Manual price override' }}
        automaticValue={automatic.price}
        effectiveValue={effective.price}
        onChange={onChange}
      />
      <FeesPricingRow
        order={order}
        automaticValue={automatic.fees}
        effectiveValue={effective.fees}
        onChange={onChange}
      />
      <NumericPricingRow
        order={order}
        component={{ key: 'boxesPrice', label: 'Boxes price', inputLabel: 'Manual boxes price override' }}
        automaticValue={automatic.boxesPrice}
        effectiveValue={effective.boxesPrice}
        onChange={onChange}
      />
      {order.originalOrder && <OriginalWordPressOrderDialog order={order.originalOrder} />}
    </div>
  )
}
