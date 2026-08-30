import React, { useEffect, useMemo, useState } from 'react'
import { getAvailableFees } from '../../shared/fees'
import {
  calculateAutomaticPricing,
  resolveActivePricing,
} from '../../shared/orderPricing'
import {
  clearManualPricing,
  setManualPricing,
  setPricingSource,
} from '../../shared/orderModel'
import { hasOwn, PRICING_COMPONENTS } from '../../shared/orderPrimitives'

const PRICING_COMPONENT_DETAILS = {
  price: { label: 'Price', inputLabel: 'Manual price', unit: '€' },
  fees: { label: 'Fees' },
  boxesPrice: { label: 'Boxes price', inputLabel: 'Manual boxes price', unit: '€' },
}

function hasValue(value) {
  return value !== null && value !== undefined
}

function hasInitialValue(order, component) {
  return (
    order?.origin === 'wordpress' &&
    order.initialSnapshot &&
    hasOwn(order.initialSnapshot, component) &&
    hasValue(order.initialSnapshot[component])
  )
}

function formatMoney(value) {
  return `${value} €`
}

function formatFees(value) {
  if (!Array.isArray(value)) return 'Not set'
  if (value.length === 0) return 'None'
  return value.map((fee) => `${fee.label || fee.name} (${fee.amount} €)`).join(', ')
}

function formatValue(component, value) {
  if (!hasValue(value)) return 'Not set'
  if (component === 'fees') return formatFees(value)
  return formatMoney(value)
}

function isUsableNumber(value) {
  return value.trim() !== '' && Number.isFinite(Number(value))
}

function PricingRow({ order, component, initialVisible, automaticValue, activeValue, onChange }) {
  const { key, label, inputLabel, unit } = component
  const manualValue = order.pricing?.manual?.[key]
  const activeSource = order.pricing?.source?.[key]
  const initialAvailable = hasInitialValue(order, key)
  const [manualInput, setManualInput] = useState(
    key === 'fees' ? '' : hasValue(manualValue) ? String(manualValue) : '',
  )
  const [manualFees, setManualFees] = useState(Array.isArray(manualValue) ? manualValue : [])

  useEffect(() => {
    if (key === 'fees') {
      const nextFees = Array.isArray(manualValue) ? manualValue : []
      setManualFees(nextFees)
      return
    }
    setManualInput(hasValue(manualValue) ? String(manualValue) : '')
  }, [key, manualValue])

  const availableFees = useMemo(() => {
    if (key !== 'fees') return []

    const configuredFees = getAvailableFees(order)
    const configuredNames = new Set(configuredFees.map((fee) => fee.name))
    const existingManualFees = Array.isArray(manualValue)
      ? manualValue.filter((fee) => !configuredNames.has(fee.name))
      : []
    return configuredFees.concat(existingManualFees)
  }, [key, manualValue, order])

  const updateSource = (source) => onChange(setPricingSource(order, key, source))
  const clearManual = () => onChange(clearManualPricing(order, key))
  const useManual = () => {
    const value = key === 'fees' ? manualFees : Number(manualInput)
    onChange(setManualPricing(order, key, value))
  }

  return (
    <section aria-labelledby={`${key}-pricing-title`} className="pricing-comparison-row">
      <h3 id={`${key}-pricing-title`}>{label}</h3>
      {initialVisible && (
        <p>
          Initial: {initialAvailable ? formatValue(key, order.initialSnapshot[key]) : 'Not available'}
        </p>
      )}
      <p>Automatic: {formatValue(key, automaticValue)}</p>
      <p>Manual: {formatValue(key, manualValue)}</p>
      <p>
        Active: <strong>{formatValue(key, activeValue)}</strong>
      </p>
      <p>Active source: {activeSource}</p>

      <div className="pricing-comparison-actions">
        {initialVisible && (
          <button
            type="button"
            disabled={!initialAvailable}
            onClick={() => updateSource('initial')}
          >
            Use initial {label.toLowerCase()}
          </button>
        )}
        <button
          type="button"
          onClick={() => updateSource('auto')}
        >
          Use automatic {label.toLowerCase()}
        </button>
        {key === 'fees' ? (
          <div>
            {availableFees.map((fee) => (
              <label key={fee.name}>
                <input
                  type="checkbox"
                  checked={manualFees.some((selectedFee) => selectedFee.name === fee.name)}
                  onChange={() => {
                    const isSelected = manualFees.some(
                      (selectedFee) => selectedFee.name === fee.name,
                    )
                    const nextFees = isSelected
                      ? manualFees.filter((selectedFee) => selectedFee.name !== fee.name)
                      : manualFees.concat(fee)
                    setManualFees(nextFees)
                  }}
                  aria-label={`Manual ${fee.label || fee.name} fee`}
                />
                {`${fee.label || fee.name} (${fee.amount} €)`}
              </label>
            ))}
            <button type="button" onClick={useManual}>
              Use manual fees
            </button>
          </div>
        ) : (
          <>
            <label>
              {inputLabel}
              <input
                aria-label={inputLabel}
                type="number"
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                step="any"
              />
            </label>
            <button
              type="button"
              disabled={!isUsableNumber(manualInput)}
              onClick={useManual}
            >
              Use manual {label.toLowerCase()}
            </button>
            {unit && <span className="pricing-comparison-unit">{unit}</span>}
          </>
        )}
        <button
          type="button"
          disabled={!hasValue(manualValue)}
          onClick={clearManual}
        >
          Clear manual {label.toLowerCase()}
        </button>
      </div>
    </section>
  )
}

export default function PricingComparison({ order, onChange, onRevert, reverting = false }) {
  if (!order) return null

  const automaticPricing = calculateAutomaticPricing(order)
  const activePricing = resolveActivePricing(order)
  const initialVisible = order.origin === 'wordpress'

  return (
    <div className="pricing-comparison" aria-label="Pricing comparison">
      {PRICING_COMPONENTS.map((key) => {
        const component = { key, ...PRICING_COMPONENT_DETAILS[key] }
        return (
          <PricingRow
            key={component.key}
            order={order}
            component={component}
            initialVisible={initialVisible}
            automaticValue={automaticPricing[component.key]}
            activeValue={activePricing[component.key]}
            onChange={onChange}
          />
        )
      })}
      {initialVisible && onRevert && (
        <button
          type="button"
          disabled={reverting}
          onClick={() => {
            if (window.confirm('Revert the entire order to its initial values?')) {
              onRevert()
            }
          }}
        >
          {reverting ? 'Reverting...' : 'Revert entire order'}
        </button>
      )}
    </div>
  )
}
