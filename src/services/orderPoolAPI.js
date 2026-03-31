/* eslint-disable no-param-reassign */
import interceptor from './interceptor'

const baseUrl = '/api/order-pool'
const baseUrl_v2 = '/api/order-pool/v2'
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

/**
 * @param {Array} [pages] - Default: [ 1 ]
 * @param {Object} options - Default: { deleted: false, forceUpdate: false }
 * @param {Boolean} [options.deleted]
 * @param {Boolean} [options.forceUpdate]
 */
async function get(pages = [1], options = { deleted: false }) {
  const { deleted } = options

  const query = `${deleted ? 'deleted=true' : 'deleted=false'}&${makeQueryArray('pages', pages)}`

  // example: /api/order-pool/?deleted=false&pages[]=1&pages[]=2
  const url = `${baseUrl_v2}/?${query}`

  return interceptor.axiosInstance.get(url).then(async (res) => {
    const { orders } = res?.data
    // await storeOrdersInSessionStorage({ query, orders })

    return orders
  })
}

async function getOrderById(id) {
  return interceptor.axiosInstance.get(`${baseUrl_v2}/${id}`).then((res) => res?.data)
}

async function getByRange({ from, to, deleted = false } = {}) {
  const baseQuery = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const deletedQuery =
    deleted === null || typeof deleted === 'undefined' ? '' : `&deleted=${deleted}`
  const query = `${baseQuery}${deletedQuery}`
  const url = `${baseUrl_v2}/?${query}`

  return interceptor.axiosInstance.get(url).then((res) => {
    const { orders } = res?.data
    return orders
  })
}

function confirm(id) {
  return interceptor.axiosInstance.put(`${baseUrl_v2}/confirm/${id}`).then((res) => res?.data)
  // .catch((err) => console.log(err))
}

function cancel(id) {
  return interceptor.axiosInstance.put(`${baseUrl_v2}/cancel/${id}`).then((res) => res?.data)
}

async function remove(id) {
  const response = await interceptor.axiosInstance.delete(`${baseUrl}/delete/${id}`)
  return response?.data
}

async function retrieve(id) {
  const response = await interceptor.axiosInstance.put(`${baseUrl_v2}/retrieve/${id}`)
  return response?.data
}

function getConfirmedOrders(period, options = { onlyCount: true }) {
  const { periodFrom, periodTo } = period

  return interceptor.axiosInstance
    .get(`${baseUrl}/confirmed-by-user/?periodFrom=${periodFrom}&periodTo=${periodTo}`)
    .then((res) => res.data)
}

function add({ order }) {
  return interceptor.axiosInstance.post(`${baseUrl}/v2/add`, { order }).then((res) => res?.data)
}

function update(id, updateData) {
  return interceptor.axiosInstance
    .put(`${baseUrl_v2}/${id}`, { updateData })
    .then((res) => res?.data)
}

function updateColor(id, eventColor) {
  return interceptor.axiosInstance
    .patch(`${baseUrl_v2}/${id}/color`, { eventColor })
    .then((res) => res?.data)
}

const orderPoolAPI = {
  get,
  getOrderById,
  getByRange,
  confirm,
  cancel,
  remove,
  retrieve,
  getConfirmedOrders,
  add,
  update,
  updateColor,
}

export default orderPoolAPI
