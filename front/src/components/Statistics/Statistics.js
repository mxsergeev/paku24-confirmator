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
import orderPoolApi from '../../services/orderPoolAPI'

dayjs.extend(isoWeek)
dayjs.extend(weekOfYear)

// const useStyles = makeStyles({
//   table: {
//     minWidth: 650,
//   },
// })

function createData(name, orderCount) {
  return { name, orderCount }
}

export default function Statistics() {
  const defStartDate = dayjs().startOf('month')
  const defEndDate = defStartDate.add(1, 'month').startOf('month')
  const [period, setPeriod] = useState({
    start: defStartDate,
    end: defEndDate,
  })
  const [confirmedOrders, setConfirmedOrders] = useState([])

  const [rows, setRows] = useState([])

  // console.log(period)
  // console.log(period.start.isoWeek())
  // console.log(period.end.isoWeek())
  // console.log(dayjs().isoWeek(21).startOf('isoWeek').toDate())

  useEffect(async () => {
    const numberOfWeeks = period.end.isoWeek() - period.start.isoWeek() + 1 // 6
    const weeks = Array(numberOfWeeks)
      .fill(period.start.isoWeek())
      .map((number, count) => number + count) // [17, 18, 19, 20, 21, 22]
      .map((weekNumber) => ({
        // { start: Unix Timestamp_ms, end: Unix Timestamp_ms}
        start: dayjs().isoWeek(weekNumber).startOf('isoWeek').valueOf(),
        end: dayjs()
          .isoWeek(weekNumber + 1)
          .startOf('isoWeek')
          .valueOf(),
      }))
      .concat({ start: period.start.valueOf(), end: period.end.valueOf() }) // Adding whole period

    console.log(weeks)

    const apiCallsArray = []

    weeks.forEach((week) => {
      apiCallsArray.push(orderPoolApi.getConfirmedOrders([week.start, week.end]))
    })

    const ordersByWeek = await Promise.all(apiCallsArray)

    console.log(ordersByWeek)

    setConfirmedOrders(ordersByWeek)

    setRows(
      ordersByWeek.map((order, index, array) => {
        const weekNumber = dayjs(weeks[index].start).isoWeek()
        const label =
          index === array.length - 1
            ? 'Total during specified period'
            : `Week ${weekNumber}`

        return createData(label, order.orderCount)
      })
    )
  }, [period])

  function handlePeriodChange(e) {
    setPeriod({ ...period, [e.target.name]: dayjs(e.target.value) })
  }

  // console.log(confirmedOrders)

  return (
    <>
      <div className="row-flex-start gap-1">
        <TextField
          onChange={handlePeriodChange}
          name="start"
          label="Start of period"
          type="date"
          value={period.start.format('YYYY-MM-DD')}
        />
        <TextField
          onChange={handlePeriodChange}
          name="end"
          label="End of period"
          type="date"
          value={period.end.format('YYYY-MM-DD')}
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
