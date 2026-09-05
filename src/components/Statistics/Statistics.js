import React, { useEffect, useState } from 'react'
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
import './Statistics.css'
import ordersAPI from '../../services/ordersAPI'
import dayjs from '../../shared/dayjs'
import { formatHelsinkiInstant } from '../../shared/date-fns-tz'

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

function groupOrdersByDay(orders) {
  return orders.reduce((byDay, order) => {
    let day = 'Unknown day'
    try {
      day = formatHelsinkiInstant(order.confirmedAt, 'EEEE', 'confirmed at')
    } catch {
      // Keep malformed lifecycle data visible without crashing the statistics popover.
    }

    if (!byDay[day]) byDay[day] = []
    byDay[day].push(order)
    return byDay
  }, {})
}

export default function Statistics() {
  const defStartDate = dayjs().startOf('month')
  const defEndDate = defStartDate.add(1, 'month').startOf('month')
  const [period, setPeriod] = useState({
    periodFrom: defStartDate,
    periodTo: defEndDate,
  })
  const [orders, setOrders] = useState([])
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(null)

  useEffect(() => {
    let active = true

    async function fetchStats() {
      const weeks = splitPeriodToWeeks(period)
      if (weeks.length === 0) {
        setOrders([])
        return
      }

      const firstWeek = weeks[0]
      const lastWeek = weeks[weeks.length - 1]

      const {
        confirmedOrders: confirmedOrdersOfAllWeeksOfPeriod,
      } = await ordersAPI.getConfirmedOrders({
        periodFrom: firstWeek.periodFrom,
        periodTo: lastWeek.periodTo,
      })

      if (active) setOrders(confirmedOrdersOfAllWeeksOfPeriod || [])
    }

    setOrders([])
    fetchStats()

    return () => {
      active = false
    }
  }, [period])

  const weeks = splitPeriodToWeeks(period)
  const ordersByWeeks = splitOrdersByPeriods(orders, weeks)
  const ordersOfWholePeriod = splitOrdersByPeriods(orders, [period])[0] || []
  const rows = [
    ...ordersByWeeks.map((weekOrders, index) => ({
      name: 'Week ' + dayjs(weeks[index].periodFrom).isoWeek(),
      orderCount: weekOrders.length,
    })),
    {
      name: 'Total during specified period',
      orderCount: ordersOfWholePeriod.length,
    },
  ]

  const handlePeriodChange = (e) => {
    setPeriod((prev) => ({ ...prev, [e.target.name]: dayjs(e.target.value) }))
  }

  function showOrdersByDay(e) {
    setAnchorEl(e.currentTarget)
    setSelectedWeekIndex(Number(e.currentTarget.dataset.rownumber))
  }

  function closeOrdersByDay() {
    setAnchorEl(null)
    setSelectedWeekIndex(null)
  }

  const selectedWeekOrders =
    selectedWeekIndex === null ? [] : ordersByWeeks[selectedWeekIndex] || []
  const ordersByDays = groupOrdersByDay(selectedWeekOrders)
  const open = Boolean(anchorEl)
  const shouldApplyEventHandler = (row, rowNumber) =>
    rowNumber < weeks.length && row.orderCount > 0

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
              <TableRow key={row.name + rowNumber}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    data-rownumber={rowNumber}
                    size="small"
                    onClick={shouldApplyEventHandler(row, rowNumber) ? showOrdersByDay : null}
                  >
                    {row.orderCount}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Popper style={{ padding: 10 }} placement="left" open={open} anchorEl={anchorEl}>
        <ClickAwayListener
          mouseEvent="onMouseDown"
          touchEvent="onTouchStart"
          onClickAway={closeOrdersByDay}
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
    </div>
  )
}
