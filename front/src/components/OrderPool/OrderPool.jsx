import React, { useEffect, useState } from 'react'
import TextField from '@material-ui/core/TextField'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import Button from '@material-ui/core/Button'
import DeleteIcon from '@material-ui/icons/Delete'
import RestoreIcon from '@material-ui/icons/Restore'
import orderPoolAPI from '../../services/orderPoolAPI'
import LoadingUntillDone from '../LoadingUntillDone'
import OrdersList from './OrdersList'

export default function OrderPool({ setOrderText, handleClose }) {
  const [orders, setOrders] = useState([])
  const [searchText, setSearchText] = useState('')
  const [showOnlyNotConfirmed, setShowOnlyNotConfirmed] = useState(false)
  const [searchResults, setSearchResults] = useState(orders)
  const [showDeletedOrders, setShowDeletedOrders] = useState(false)
  const [isLoading, setIsloading] = useState(true)

  const numberOfUnconfirmedOrders = orders.filter((order) => !order.confirmed)
    .length

  useEffect(async () => {
    setIsloading(true)
    const ordersFromPool = showDeletedOrders
      ? await orderPoolAPI.getDeleted()
      : await orderPoolAPI.get()
    setOrders(ordersFromPool)
    setSearchResults(ordersFromPool)
    setIsloading(false)
  }, [showDeletedOrders])

  function filterWithSearchText(values, search) {
    return values.filter((value) =>
      value.text.toLowerCase().includes(search.toLowerCase().trim())
    )
  }

  function filterConfirmed(values, condition) {
    return condition
      ? values.filter((value) => value.confirmed === false)
      : values
  }

  function handleSearchChange(e) {
    setSearchText(e.target.value)

    const filteredWithConfirmedAndSearch = filterConfirmed(
      filterWithSearchText(orders, e.target.value),
      showOnlyNotConfirmed
    )

    const result = filteredWithConfirmedAndSearch

    setSearchResults(result)
  }

  function handleOnlyNotConfirmedSearch(e) {
    const isOnlyNotConfirmed = e.target.checked
    setShowOnlyNotConfirmed(isOnlyNotConfirmed)

    const filteredWithConfirmedAndSearch = filterConfirmed(
      filterWithSearchText(orders, searchText),
      isOnlyNotConfirmed
    )

    const result = filteredWithConfirmedAndSearch

    setSearchResults(result)
  }

  function handleToConfirmatorClick(order) {
    setOrderText({ text: order.text, id: order.id })
    handleClose()
  }

  async function handleOrderDeletion(id) {
    await orderPoolAPI.remove(id)
    setOrders(orders.filter((order) => order.id !== id))
    setSearchResults(orders.filter((order) => order.id !== id))
  }

  async function handleRetrieval(id) {
    await orderPoolAPI.retrieve(id)
    setOrders(orders.filter((order) => order.id !== id))
    setSearchResults(orders.filter((order) => order.id !== id))
  }

  return (
    <>
      <h3 style={{ marginTop: '4px', marginBottom: '7px' }}>
        {showDeletedOrders ? 'Trashcan' : 'Inbox'}
      </h3>
      <TextField
        className="flex-item"
        type="text"
        name="searchText"
        placeholder="Search"
        value={searchText}
        onChange={handleSearchChange}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={showOnlyNotConfirmed}
            onChange={handleOnlyNotConfirmedSearch}
            name="showOnlyNotConfirmed"
            color="primary"
          />
        }
        label="Unconfirmed"
      />
      <span>
        {searchResults.length}/{orders.length}
      </span>
      <Button
        onClick={() => setShowDeletedOrders(!showDeletedOrders)}
        variant="text"
        size="small"
      >
        {showDeletedOrders ? 'Inbox' : 'Trashcan'}
      </Button>
      {numberOfUnconfirmedOrders > 0 && (
        <>
          <span>{numberOfUnconfirmedOrders}</span>
          <span className="order-status-icon order-status-notification">
            ❕
          </span>
        </>
      )}
      <LoadingUntillDone loading={isLoading}>
        <OrdersList
          orders={searchResults}
          handleClick={handleToConfirmatorClick}
          labelForDeletion={
            showDeletedOrders ? <RestoreIcon /> : <DeleteIcon />
          }
          handleDeletion={
            showDeletedOrders ? handleRetrieval : handleOrderDeletion
          }
        />
      </LoadingUntillDone>
    </>
  )
}
