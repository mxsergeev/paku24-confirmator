import React, { useCallback, useEffect, useState } from 'react'
import { enqueueSnackbar } from 'notistack'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import IconButton from '@material-ui/core/IconButton'
import RefreshIcon from '@material-ui/icons/Refresh'
import DeleteIcon from '@material-ui/icons/Delete'
import RestoreIcon from '@material-ui/icons/Restore'
import orderPoolAPI from '../../../services/orderPoolAPI'
import LoadingUntillDone from '../../LoadingUntillDone'
import OrdersList from './OrdersList'
import { formatAddress } from '../../../shared/render/text'
import './OrderPool.css'

const INBOX = 'inbox'
const TRASHCAN = 'trashcan'

function addressSearchText(addresses) {
  return addresses.filter(Boolean).map((address) => formatAddress(address))
}

function matchesSearch(order, searchText) {
  const search = String(searchText ?? '').trim().toLowerCase()
  if (!search) return true

  const searchableValues = [
    order?.name,
    order?.email,
    order?.phone,
    order?.comment,
    order?.service?.name,
    order?.serviceName,
    order?.paymentType?.name,
    order?.paymentTypeName,
    ...addressSearchText([
      order?.address,
      ...(Array.isArray(order?.extraAddresses) ? order.extraAddresses : []),
      order?.destination,
    ]),
  ]

  return searchableValues.some((value) =>
    String(value ?? '').toLowerCase().includes(search)
  )
}

function filterOrders(values, { searchText, showOnlyNotConfirmed }) {
  const searchedOrders = values.filter((order) => matchesSearch(order, searchText))
  return showOnlyNotConfirmed
    ? searchedOrders.filter((order) => !order?.confirmed)
    : searchedOrders
}

export default function OrderPool({ handleExport }) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsloading] = useState(true)

  const [currentTab, setCurrentTab] = useState(INBOX)
  const [filtersByTab, setFiltersByTab] = useState({
    inbox: {
      searchText: '',
      showOnlyNotConfirmed: false,
    },
    trashcan: {
      searchText: '',
      showOnlyNotConfirmed: false,
    },
  })
  const [pagesByTab, setPagesByTab] = useState({ inbox: [1], trashcan: [1] })
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const numberOfOrders = orders.length
  const numberOfUnconfirmedOrders = orders.filter((order) => !order.confirmed).length
  const currentFilters = filtersByTab[currentTab]
  const visibleOrders = filterOrders(orders, currentFilters)

  useEffect(() => {
    let isCurrentRequest = true

    async function fetchData() {
      setIsloading(true)
      try {
        const ordersFromPool =
          currentTab === INBOX
            ? await orderPoolAPI.get(pagesByTab[currentTab])
            : await orderPoolAPI.get(pagesByTab[currentTab], { deleted: true })

        if (!isCurrentRequest) return
        setOrders(ordersFromPool)
        setIsloading(false)
      } catch (err) {
        if (!isCurrentRequest) return
        enqueueSnackbar(err?.response?.data?.error || err.message, { variant: 'error' })
        setIsloading(false)
      }
    }
    fetchData()
    return () => {
      isCurrentRequest = false
    }
  }, [currentTab, pagesByTab, refreshTrigger])

  const handleLoadingMoreOrders = useCallback(() => {
    setPagesByTab((prevPages) => ({
      ...prevPages,
      [currentTab]: [...prevPages[currentTab], prevPages[currentTab].length + 1],
    }))
  }, [currentTab])

  const handleSearchChange = useCallback((e) => {
    const searchText = e.target.value
    setFiltersByTab((prevFilters) => ({
      ...prevFilters,
      [currentTab]: { ...prevFilters[currentTab], searchText },
    }))
  }, [currentTab])

  const handleOnlyNotConfirmedSearch = useCallback((bool) => {
    setFiltersByTab((prevFilters) => ({
      ...prevFilters,
      [currentTab]: { ...prevFilters[currentTab], showOnlyNotConfirmed: bool },
    }))
  }, [currentTab])

  const handleTabBarChange = useCallback((e) => {
    setCurrentTab(e.target.dataset.tabname)
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prevTrigger) => prevTrigger + 1)
  }, [])

  const handleOrderDeletion = useCallback(
    async (id) => {
      await orderPoolAPI.remove(id)
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id))
    },
    []
  )

  const handleRetrieval = useCallback(
    async (id) => {
      await orderPoolAPI.retrieve(id)
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id))
    },
    []
  )

  const inboxClassName = () =>
    currentTab === INBOX ? 'tab-panel-item tab-panel-item-selected' : 'tab-panel-item'

  const trashcanClassName = () =>
    currentTab === TRASHCAN ? 'tab-panel-item tab-panel-item-selected' : 'tab-panel-item'

  return (
    <>
      <div className="tab-panel">
        <Button onClick={handleTabBarChange} className="p-0" variant="text" size="small">
          <h3 data-tabname={INBOX} className={inboxClassName()}>
            Inbox
          </h3>
        </Button>
        <Button onClick={handleTabBarChange} className="p-0" variant="text" size="small">
          <h3 data-tabname={TRASHCAN} className={trashcanClassName()}>
            Trashcan
          </h3>
        </Button>
        <IconButton
          style={{ marginLeft: 'auto', marginRight: '12px' }}
          onClick={handleRefresh}
          className="p-0"
          variant="text"
          size="small"
        >
          <RefreshIcon />
        </IconButton>
      </div>
      <div className="filters-tab">
        <span className="filters-tab-orders-count">
          {visibleOrders.length}/{orders.length}
        </span>
        <TextField
          className="flex-item"
          type="text"
          name="searchText"
          placeholder="Search"
          value={currentFilters.searchText}
          onChange={handleSearchChange}
        />
        {numberOfUnconfirmedOrders > 0 && (
          <Button
            className="p-0 filters-tab-orders-status-icon"
            size="small"
            onClick={() =>
              handleOnlyNotConfirmedSearch(!currentFilters.showOnlyNotConfirmed)
            }
          >
            <span style={{ fontSize: '1rem' }}>
              {currentFilters.showOnlyNotConfirmed
                ? numberOfOrders
                : numberOfUnconfirmedOrders}
            </span>
            <span
              className={`order-status-icon order-status-notification ${
                currentFilters.showOnlyNotConfirmed && 'order-status-icon-selected'
              }`}
            >
              {currentFilters.showOnlyNotConfirmed ? '✔&❕' : '❕'}
            </span>
          </Button>
        )}
      </div>
      <LoadingUntillDone loading={isLoading}>
        <OrdersList
          orders={visibleOrders}
          handleExport={handleExport}
          labelForDeletion={currentTab === TRASHCAN ? <RestoreIcon /> : <DeleteIcon />}
          handleDeletion={currentTab === TRASHCAN ? handleRetrieval : handleOrderDeletion}
          handleLoadingMoreOrders={handleLoadingMoreOrders}
        />
      </LoadingUntillDone>
    </>
  )
}
