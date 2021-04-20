import React, { useEffect, useState } from 'react'
import { useHistory, Route } from 'react-router-dom'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import ResponsiveDialog from './ResponsiveDialog'
import LoadingUntillDone from './LoadingUntillDone'
import orderPoolAPI from '../services/orderPoolAPI'

function OrdersList({ orders, handleClick }) {
  const styles = {
    basicStyle: {
      marginTop: '10px',
      paddingBottom: '10px',
    },
    confirmedStyle: {
      height: '50px',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      color: 'gray',
    },
  }

  const a = orders.map((order) => ({
    key: order.id,
    style: styles.basicStyle,
  }))
  const [ordersWithStyles, setOrdersWithStyles] = useState(a)

  useEffect(() => {
    setOrdersWithStyles(
      orders.map((order) => ({
        ...order,
        style: order.confirmed
          ? { ...styles.basicStyle, ...styles.confirmedStyle }
          : styles.basicStyle,
        hidden: order.confirmed,
      }))
    )
  }, [orders])

  function handleHideOrShow(order) {
    setOrdersWithStyles([
      ...ordersWithStyles.map((o) => {
        if (o.id === order.id) {
          return {
            ...order,
            hidden: !o.hidden,
            style: o.hidden
              ? styles.basicStyle
              : { ...styles.basicStyle, ...styles.confirmedStyle },
          }
        }
        return o
      }),
    ])
  }

  return ordersWithStyles.map((order) => (
    <div style={order.style} key={order.id}>
      {order.confirmed ? (
        <Button
          variant="text"
          size="small"
          onClick={() => handleHideOrShow(order)}
        >
          ➕
        </Button>
      ) : null}
      <div
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: order.text.split('\n').join('<br>'),
        }}
      />
      <Button
        disabled={order.confirmed}
        onClick={() => handleClick(order)}
        variant="outlined"
      >
        To confirmator
      </Button>
      <span> {order.confirmed ? '✅' : ''} </span>
    </div>
  ))
}

function OrderPool({ setOrderText, handleClose }) {
  const [orders, setOrders] = useState([])
  const [searchText, setSearchText] = useState('')
  const [showOnlyNotConfirmed, setShowOnlyNotConfirmed] = useState(false)
  const [searchResults, setSearchResults] = useState(orders)

  useEffect(async () => {
    const ordersFromPool = await orderPoolAPI.get()
    setOrders(ordersFromPool)
    setSearchResults(ordersFromPool)
  }, [])

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

  return (
    <LoadingUntillDone
      loading={orders.length === 0}
      targetComponent={
        <>
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
            label="Only unconfirmed"
          />
          <span>
            {searchResults.length}/{orders.length}
          </span>
          <OrdersList
            orders={searchResults}
            handleClick={handleToConfirmatorClick}
          />
        </>
      }
    />
  )
}

export default function OrderPoolDialog({ setOrderText }) {
  const history = useHistory()

  const handleClickOpen = () => {
    history.push('/order-pool')
  }

  const handleClose = () => {
    history.goBack()
  }

  return (
    <>
      <Button
        className="button-one-third"
        variant="contained"
        onClick={handleClickOpen}
      >
        Open Order Pool
      </Button>
      <Route exact path="/order-pool">
        <ResponsiveDialog
          component={
            <OrderPool setOrderText={setOrderText} handleClose={handleClose} />
          }
          handleClose={handleClose}
        />
      </Route>
    </>
  )
}
