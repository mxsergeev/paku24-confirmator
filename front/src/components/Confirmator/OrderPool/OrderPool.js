import React, { useEffect, useState } from 'react'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import IconButton from '@material-ui/core/IconButton'
import RefreshIcon from '@material-ui/icons/Refresh'
import DeleteIcon from '@material-ui/icons/Delete'
import RestoreIcon from '@material-ui/icons/Restore'
import orderPoolAPI from '../../../services/orderPoolAPI'
import LoadingUntillDone from '../../LoadingUntillDone'
import OrdersList from './OrdersList'
import './OrderPool.css'

const INBOX = 'inbox'
const TRASHCAN = 'trashcan'

export default function OrderPool({ handleExport }) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsloading] = useState(true)

  const [currentTab, setCurrentTab] = useState(INBOX)
  const [searchOptions, setSearchOptions] = useState({
    inbox: {
      pages: [1],
      searchText: '',
      showOnlyNotConfirmed: false,
    },
    trashcan: {
      pages: [1],
      searchText: '',
      showOnlyNotConfirmed: false,
    },
  })
  const [searchResults, setSearchResults] = useState(orders)
  const [forceUpdate, setForceUpdate] = useState({ hasToUpdate: false, trigger: 0 })
  const [pages, setPages] = useState({ inbox: [1], trashcan: [1] })

  const numberOfOrders = orders.length
  const numberOfUnconfirmedOrders = orders.filter((order) => !order.confirmed).length

  function filterWithSearchText(values, search) {
    return values.filter((value) =>
      value.text.toLowerCase().includes(search?.toLowerCase().trim())
    )
  }

  function filterConfirmed(values, condition) {
    return condition ? values.filter((value) => value?.confirmed === false) : values
  }

  function makeSearch(val, bool, searchTarget) {
    const filteredWithConfirmedAndSearch = filterConfirmed(
      filterWithSearchText(searchTarget, val),
      bool
    )
    return filteredWithConfirmedAndSearch
  }

  useEffect(async () => {
    setIsloading(true)
    const ordersFromPool =
      currentTab === INBOX
        ? await orderPoolAPI.get(pages[currentTab], {
            forceUpdate: forceUpdate.hasToUpdate,
          })
        : await orderPoolAPI.get(pages[currentTab], {
            deleted: true,
            forceUpdate: forceUpdate.hasToUpdate,
          })

    if (!ordersFromPool) return

    setOrders(ordersFromPool)

    const filteredOrders = makeSearch(
      searchOptions[currentTab].searchText,
      searchOptions[currentTab].showOnlyNotConfirmed,
      ordersFromPool
    )
    setSearchResults(filteredOrders)
    setIsloading(false)
  }, [currentTab, forceUpdate.trigger])

  async function handleLoadingMoreOrders() {
    const newPage = [pages[currentTab].length + 1]
    setPages({
      ...pages,
      [currentTab]: [...pages[currentTab], ...newPage],
    })
    const moreOrdersFromPool =
      currentTab === INBOX
        ? await orderPoolAPI.get(newPage)
        : await orderPoolAPI.get(newPage, { deleted: true })

    const concatenatedOrders = orders.concat(moreOrdersFromPool)

    setOrders(concatenatedOrders)

    const filteredOrders = makeSearch(
      searchOptions[currentTab].searchText,
      searchOptions[currentTab].showOnlyNotConfirmed,
      concatenatedOrders
    )
    setSearchResults(filteredOrders)
  }

  function handleSearchChange(e) {
    const prevOptsForCurTab = searchOptions[currentTab]
    setSearchOptions({
      ...searchOptions,
      [currentTab]: { ...prevOptsForCurTab, searchText: e.target.value },
    })

    const filteredOrders = makeSearch(
      e.target.value,
      prevOptsForCurTab.showOnlyNotConfirmed,
      orders
    )

    setSearchResults(filteredOrders)
  }

  function handleOnlyNotConfirmedSearch(bool) {
    const prevOptsForCurTab = searchOptions[currentTab]
    setSearchOptions({
      ...searchOptions,
      [currentTab]: { ...prevOptsForCurTab, showOnlyNotConfirmed: bool },
    })

    const filteredOrders = makeSearch(prevOptsForCurTab.searchText, bool, orders)

    setSearchResults(filteredOrders)
  }

  function handleTabBarChange(e) {
    setCurrentTab(e.target.dataset.tabname)
  }

  function handleRefresh() {
    setForceUpdate({
      ...forceUpdate,
      trigger: forceUpdate.trigger + 1,
      hasToUpdate: true,
    })
    setTimeout(() =>
      setForceUpdate({
        ...forceUpdate,
        hasToUpdate: false,
      })
    )
  }

  async function handleOrderDeletion(id) {
    await orderPoolAPI.remove(id)
    setOrders(orders.filter((order) => order.id !== id))
    setSearchResults(searchResults.filter((order) => order.id !== id))
  }

  async function handleRetrieval(id) {
    await orderPoolAPI.retrieve(id)
    setOrders(orders.filter((order) => order.id !== id))
    setSearchResults(searchResults.filter((order) => order.id !== id))
  }

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
          {searchResults.length}/{orders.length}
        </span>
        <TextField
          className="flex-item"
          type="text"
          name="searchText"
          placeholder="Search"
          value={searchOptions[currentTab].searchText}
          onChange={handleSearchChange}
        />
        {numberOfUnconfirmedOrders > 0 && (
          <Button
            className="p-0 filters-tab-orders-status-icon"
            size="small"
            onClick={() =>
              handleOnlyNotConfirmedSearch(
                !searchOptions[currentTab].showOnlyNotConfirmed
              )
            }
          >
            <span style={{ fontSize: '1rem' }}>
              {searchOptions[currentTab].showOnlyNotConfirmed
                ? numberOfOrders
                : numberOfUnconfirmedOrders}
            </span>
            <span
              className={`order-status-icon order-status-notification ${
                searchOptions[currentTab].showOnlyNotConfirmed &&
                'order-status-icon-selected'
              }`}
            >
              {searchOptions[currentTab].showOnlyNotConfirmed ? '✔&❕' : '❕'}
            </span>
          </Button>
        )}
      </div>
      <LoadingUntillDone loading={isLoading}>
        <OrdersList
          orders={searchResults}
          handleExport={handleExport}
          labelForDeletion={currentTab === TRASHCAN ? <RestoreIcon /> : <DeleteIcon />}
          handleDeletion={currentTab === TRASHCAN ? handleRetrieval : handleOrderDeletion}
          handleLoadingMoreOrders={handleLoadingMoreOrders}
        />
      </LoadingUntillDone>
    </>
  )
}
