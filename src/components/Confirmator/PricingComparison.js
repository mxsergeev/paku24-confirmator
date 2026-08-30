import React, { useState } from 'react'
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
import { hasOwn } from '../../shared/orderPrimitives'

const PRICE_COMPONENT = {
  key: 'price',
  label: 'Price',
  inputLabel: 'Manual price',
}

const BOXES_PRICE_COMPONENT = {
  key: 'boxesPrice',
  label: 'Boxes price',
  inputLabel: 'Manual boxes price',
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
  return hasValue(value) ? `${value} €` : 'Not set'
}

function formatFees(value) {
  if (!Array.isArray(value)) return 'Not set'
  if (value.length === 0) return 'None'
  return value.map((fee) => `${fee.label || fee.name} (${fee.amount} €)`).join(', ')
}

function isUsableNumber(value) {
  return value.trim() !== '' && Number.isFinite(Number(value))
}

function NumericPricingRow({
  order,
  component,
  initialVisible,
  automaticValue,
  activeValue,
  onChange,
}) {
  const { key, label, inputLabel } = component
  const manualValue = order.pricing?.manual?.[key]
  const activeSource = order.pricing?.source?.[key]
  const initialAvailable = hasInitialValue(order, key)

  // This is only an uncommitted input draft. Once it is applied or cleared,
  // the canonical value comes from order.pricing again.
  const [manualInputDraft, setManualInputDraft] = useState(null)
  const draftValue = manualInputDraft?.order === order ? manualInputDraft.value : null
  const manualInput =
    draftValue === null ? (hasValue(manualValue) ? String(manualValue) : '') : draftValue

  const updateSource = (source) => onChange(setPricingSource(order, key, source))
  const clearManual = () => {
    setManualInputDraft(null)
    onChange(clearManualPricing(order, key))
  }
  const useManual = () => {
    if (!isUsableNumber(manualInput)) return
    onChange(setManualPricing(order, key, Number(manualInput)))
    setManualInputDraft(null)
  }

  return (
    <section aria-labelledby={`${key}-pricing-title`} className="pricing-comparison-row">
      <h3 id={`${key}-pricing-title`}>{label}</h3>
      {initialVisible && (
        <p>
          Initial: {initialAvailable ? formatMoney(order.initialSnapshot[key]) : 'Not available'}
        </p>
      )}
      <p>Automatic: {formatMoney(automaticValue)}</p>
      <p>Manual: {hasValue(manualValue) ? formatMoney(manualValue) : 'Not set'}</p>
      <p>
        Active: <strong>{formatMoney(activeValue)}</strong>
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
        <button type="button" onClick={() => updateSource('auto')}>
          Use automatic {label.toLowerCase()}
        </button>
        <label>
          {inputLabel}
          <input
            aria-label={inputLabel}
            type="number"
            value={manualInput}
            onChange={(event) =>
              setManualInputDraft({ order, value: event.target.value })
            }
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
        <span className="pricing-comparison-unit">€</span>
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

function FeesPricingRow({ order, initialVisible, automaticValue, activeValue, onChange }) {
  const manualValue = order.pricing?.manual?.fees
  const activeSource = order.pricing?.source?.fees
  const initialAvailable = hasInitialValue(order, 'fees')

  // Fee checkboxes are a temporary selection until the user applies them.
  // The committed manual fee list remains in order.pricing.manual.fees.
  const [manualFeesDraft, setManualFeesDraft] = useState(null)
  const draftFees = manualFeesDraft?.order === order ? manualFeesDraft.value : null
  const manualFees =
    draftFees === null ? (Array.isArray(manualValue) ? manualValue : []) : draftFees

  const configuredFees = getAvailableFees(order)
  const configuredNames = new Set(configuredFees.map((fee) => fee.name))
  const existingManualFees = Array.isArray(manualValue)
    ? manualValue.filter((fee) => !configuredNames.has(fee.name))
    : []
  const availableFees = configuredFees.concat(existingManualFees)

  const updateSource = (source) => onChange(setPricingSource(order, 'fees', source))
  const clearManual = () => {
    setManualFeesDraft(null)
    onChange(clearManualPricing(order, 'fees'))
  }
  const useManual = () => {
    onChange(setManualPricing(order, 'fees', manualFees))
    setManualFeesDraft(null)
  }

  return (
    <section aria-labelledby="fees-pricing-title" className="pricing-comparison-row">
      <h3 id="fees-pricing-title">Fees</h3>
      {initialVisible && (
        <p>
          Initial: {initialAvailable ? formatFees(order.initialSnapshot.fees) : 'Not available'}
        </p>
      )}
      <p>Automatic: {formatFees(automaticValue)}</p>
      <p>Manual: {formatFees(manualValue)}</p>
      <p>
        Active: <strong>{formatFees(activeValue)}</strong>
      </p>
      <p>Active source: {activeSource}</p>

      <div className="pricing-comparison-actions">
        {initialVisible && (
          <button
            type="button"
            disabled={!initialAvailable}
            onClick={() => updateSource('initial')}
          >
            Use initial fees
          </button>
        )}
        <button type="button" onClick={() => updateSource('auto')}>
          Use automatic fees
        </button>
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
                  setManualFeesDraft({ order, value: nextFees })
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
        <button
          type="button"
          disabled={!hasValue(manualValue)}
          onClick={clearManual}
        >
          Clear manual fees
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
      <NumericPricingRow
        order={order}
        component={PRICE_COMPONENT}
        initialVisible={initialVisible}
        automaticValue={automaticPricing.price}
        activeValue={activePricing.price}
        onChange={onChange}
      />
      <FeesPricingRow
        order={order}
        initialVisible={initialVisible}
        automaticValue={automaticPricing.fees}
        activeValue={activePricing.fees}
        onChange={onChange}
      />
      <NumericPricingRow
        order={order}
        component={BOXES_PRICE_COMPONENT}
        initialVisible={initialVisible}
        automaticValue={automaticPricing.boxesPrice}
        activeValue={activePricing.boxesPrice}
        onChange={onChange}
      />
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
