import React, { useState, useEffect, useCallback } from 'react'
import TextField from '@material-ui/core/TextField'
import Popper from '@material-ui/core/Popper'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import ClickAwayListener from '@material-ui/core/ClickAwayListener'
import Paper from '@material-ui/core/Paper'
import IconButton from '@material-ui/core/IconButton'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import './Statistics.css'
import orderPoolApi from '../../services/orderPoolAPI'

dayjs.extend(isSameOrAfter)
dayjs.extend(isoWeek)

/**
 * @param {Object} period
 * @param {dayjsdate} period.periodFrom
 * @param {dayjsdate} period.periodTo
 * @return {Array} Example: [{ periodFrom: '2021-05-23T21:00:00.000Z', periodTo: '2021-05-30T21:00:00.000Z'}]
 */

function splitPeriodToWeeks({ periodFrom, periodTo }) {
  const numberOfWeeksInPeriod = Math.ceil(periodTo.diff(periodFrom, 'week', true))

  // A turn of a year example: [50, 51, 52, 53, 54, 55]
  const weekNumbers = Array(numberOfWeeksInPeriod)
    .fill(periodFrom.isoWeek()) // The first week of the period
    .map((number, count) => number + count)

  const startYear = periodFrom.startOf('isoWeek').year()

  const weeks = weekNumbers.map((weekNumber) => ({
    periodFrom: dayjs().year(startYear).isoWeek(weekNumber).startOf('isoWeek').toISOString(),
    periodTo: dayjs()
      .year(startYear)
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
  const [ordersByDays, setOrdersByDays] = useState({})
  const [anchorEl, setAnchorEl] = useState(null)

  const [ordersByWeeks, setOrdersByWeeks] = useState([])
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

    const ordsByWeeks = splitOrdersByPeriods(confirmedOrdersOfAllWeeksOfPeriod, weeks)

    const ordersOfWholePeriod = splitOrdersByPeriods(confirmedOrdersOfAllWeeksOfPeriod, [period])

    const weekRows = makeWeekRows(ordsByWeeks, weeks)
    const totalRow = makeTotalRow(ordersOfWholePeriod)

    setOrdersByWeeks(ordsByWeeks)
    setRows([...weekRows, ...totalRow])
  }, [period])

  const handlePeriodChange = useCallback((e) => {
    setPeriod({ ...period, [e.target.name]: dayjs(e.target.value) })
  }, [])

  function showOrdersByDay(e) {
    setAnchorEl(e.currentTarget)

    const ordersOfSelectedWeek = ordersByWeeks[e.currentTarget.dataset.rownumber]

    const ordByDays = {}

    ordersOfSelectedWeek.forEach((order) => {
      const day = new Date(order.confirmedAt).toLocaleDateString('en-US', { weekday: 'long' })
      if (ordByDays[day] == null) {
        ordByDays[day] = []
      }
      ordByDays[day].push(order)
    })

    setOrdersByDays(ordByDays)
  }

  const open = Boolean(anchorEl)
  const shouldApplyEventHandler = (row) => row.orderCount > 0 && !row.name.includes('Total')

  return (
    <div className="statistics">
      <div className="row-flex-start gap-1 dates">
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
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowNumber) => (
              <TableRow key={row.name}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell align="right">
                  <Popper style={{ padding: 10 }} placement="left" open={open} anchorEl={anchorEl}>
                    <ClickAwayListener
                      mouseEvent="onMouseDown"
                      touchEvent="onTouchStart"
                      onClickAway={() => setAnchorEl(null)}
                    >
                      <Paper>
                        <div style={{ padding: 10 }}>
                          {Object.entries(ordersByDays).map(([key, value]) => (
                            <div key={key}>
                              {key}: {value.length}
                            </div>
                          ))}
                        </div>
                      </Paper>
                    </ClickAwayListener>
                  </Popper>
                  <IconButton
                    data-rownumber={rowNumber}
                    size="small"
                    onClick={shouldApplyEventHandler(row) ? showOrdersByDay : null}
                  >
                    {row.orderCount}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
