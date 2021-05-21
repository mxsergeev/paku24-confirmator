/* eslint-disable no-param-reassign */
import interceptor from './interceptor'

const baseUrl = '/api/order-pool'
/**
 * @param {string} queryName
 * @param {Array} items
 * @return Something like: pages[]=1&pages[]=2&pages[]=3
 */
function makeQueryArray(queryName, items) {
  return items
    .map((item, index) => {
      const isLastItem = index === items.length - 1
      return `${queryName}[]=${item}${isLastItem ? '' : '&'}`
    })
    .join('')
}

function storeOrdersInSessionStorage({ query, orders }) {
  return new Promise((resolve) => {
    resolve(
      sessionStorage.setItem(
        `order-pool/${query}`,
        JSON.stringify({
          validUntil: Date.now() + 5 * 60 * 1000,
          orders,
        })
      )
    )
  })
}

function getOrdersFromSessionStorage(query) {
  return new Promise((resolve) => {
    const { orders } = JSON.parse(sessionStorage.getItem(`order-pool/${query}`))
    resolve(orders)
  })
}

function isStorageUpToDate(query) {
  return new Promise((resolve) => {
    try {
      const { validUntil } = JSON.parse(sessionStorage.getItem(`order-pool/${query}`))
      resolve(validUntil > Date.now())
    } catch {
      resolve(false)
    }
  })
}

/**
 * @param {Array} [pages] - Default: [ 1 ]
 * @param {Object} options - Default: { deleted: false }
 * @param {Boolean} [options.deleted]
 */
async function get(pages = [1], options = { deleted: false, forceUpdate: false }) {
  const { deleted, forceUpdate } = options

  const query = `${deleted ? 'deleted=true' : 'deleted=false'}&${makeQueryArray(
    'pages',
    pages
  )}`

  if (!forceUpdate && (await isStorageUpToDate(query))) {
    return getOrdersFromSessionStorage(query)
  }

  // example: /api/order-pool/?deleted=false&pages[]=1&pages[]=2
  const url = `${baseUrl}/?${query}`

  return interceptor.axiosInstance.get(url).then((res) => {
    const { orders } = res?.data
    storeOrdersInSessionStorage({ query, orders })

    return orders
  })
}

async function confirm(id) {
  return interceptor.axiosInstance
    .put(`${baseUrl}/confirm/${id}`)
    .then((res) => res?.data)
  // .catch((err) => console.log(err))
}

async function remove(id) {
  const response = await interceptor.axiosInstance.delete(`${baseUrl}/delete/${id}`)
  return response?.data
}

async function retrieve(id) {
  const response = await interceptor.axiosInstance.put(`${baseUrl}/retrieve/${id}`)
  return response?.data
}

export default { get, confirm, remove, retrieve }
