import React, { useState, useEffect } from 'react'
import TextField from '@material-ui/core/TextField'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import Paper from '@material-ui/core/Paper'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import orderPoolApi from '../../services/orderPoolAPI'

dayjs.extend(isSameOrAfter)
dayjs.extend(isoWeek)
dayjs.extend(weekOfYear)

/**
 * @param {Object} period
 * @param {dayjsdate} period.periodFrom
 * @param {dayjsdate} period.periodTo
 * @return {Array} - [{ periodFrom: '2021-05-23T21:00:00.000Z', periodTo: '2021-05-30T21:00:00.000Z'}]
 */

function splitPeriodToWeeks({ periodFrom, periodTo }) {
  const numberOfWeeks = periodTo.isoWeek() - periodFrom.isoWeek() + 1 // 6
  const weeks = Array(numberOfWeeks)
    .fill(periodFrom.isoWeek())
    .map((number, count) => number + count) // [17, 18, 19, 20, 21, 22]
    .map((weekNumber) => ({
      periodFrom: dayjs().isoWeek(weekNumber).startOf('isoWeek').toISOString(),
      periodTo: dayjs()
        .isoWeek(weekNumber + 1)
        .startOf('isoWeek')
        .toISOString(),
    }))

  return weeks
}

function splitOrdersByPeriods(orders, periods) {
  const splitted = []
  periods.forEach((period) => {
    const filtered = orders.filter(
      (o) =>
        dayjs(o.confirmedAt).isSameOrAfter(dayjs(period.periodFrom)) &&
        dayjs(o.confirmedAt).isBefore(dayjs(period.periodTo))
    )
    splitted.push(filtered)
  })

  return splitted
}

function createData(name, orderCount) {
  return { name, orderCount }
}

/**
 * @returns {array} Array of objects
 */
function makeRows(labels, data) {
  return data.map((d, i) => createData(labels[i], d))
}

function makeWeekRows(orders, weeks) {
  return makeRows(
    orders.map((o, i) => `Week ${dayjs(weeks[i].periodFrom).isoWeek()}`),
    orders.map((o) => o.length)
  )
}

function makeTotalRow(orders) {
  return makeRows(
    ['Total during specified period'],
    orders.map((o) => o.length)
  )
}

export default function Statistics() {
  const defStartDate = dayjs().startOf('month')
  const defEndDate = defStartDate.add(1, 'month').startOf('month')
  const [period, setPeriod] = useState({
    periodFrom: defStartDate,
    periodTo: defEndDate,
  })

  const [rows, setRows] = useState([])

  useEffect(async () => {
    const weeks = splitPeriodToWeeks(period)
    const firstWeek = weeks[0]
    const lastWeek = weeks[weeks.length - 1]

    const {
      confirmedOrders: confirmedOrdersOfAllWeeksOfPeriod,
    } = await orderPoolApi.getConfirmedOrders({
      periodFrom: firstWeek.periodFrom,
      periodTo: lastWeek.periodTo,
    })

    const ordersByWeeks = splitOrdersByPeriods(confirmedOrdersOfAllWeeksOfPeriod, weeks)
    const ordersOfWholePeriod = splitOrdersByPeriods(confirmedOrdersOfAllWeeksOfPeriod, [period])

    const weekRows = makeWeekRows(ordersByWeeks, weeks)
    const totalRow = makeTotalRow(ordersOfWholePeriod)

    setRows([...weekRows, ...totalRow])
  }, [period])

  function handlePeriodChange(e) {
    setPeriod({ ...period, [e.target.name]: dayjs(e.target.value) })
  }

  return (
    <>
      <div className="row-flex-start gap-1">
        <TextField
          onChange={handlePeriodChange}
          name="periodFrom"
          label="Start of period"
          type="date"
          value={period.periodFrom.format('YYYY-MM-DD')}
        />
        <TextField
          onChange={handlePeriodChange}
          name="periodTo"
          label="End of period"
          type="date"
          value={period.periodTo.format('YYYY-MM-DD')}
        />
      </div>
      <TableContainer component={Paper}>
        <Table aria-label="statistics table">
          <TableHead>
            <TableRow>
              <TableCell>Statistics</TableCell>
              <TableCell align="right">Confirmed orders</TableCell>
              {/* <TableCell align="right">Fat&nbsp;(g)</TableCell>
            <TableCell align="right">Carbs&nbsp;(g)</TableCell>
            <TableCell align="right">Protein&nbsp;(g)</TableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.name}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell align="right">{row.orderCount}</TableCell>
                {/* <TableCell align="right">{row.fat}</TableCell>
              <TableCell align="right">{row.carbs}</TableCell>
              <TableCell align="right">{row.protein}</TableCell> */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
