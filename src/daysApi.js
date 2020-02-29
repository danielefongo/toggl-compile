const axios = require('axios').default
const moment = require('moment')

module.exports = function (workingDays, apiKey, locale) {
  this.workingDays = workingDays
  this.API_KEY = apiKey
  this.locale = locale

  this.workingDaysIn = async function (startMoment, endMoment) {
    var festiveDays = await this.festiveDaysIn(startMoment, endMoment)

    return toDaysRange(startMoment, endMoment)
      .filter(day => isWeekDay(day, this.workingDays) && isNotFestive(day, festiveDays))
  }

  this.weekendDaysIn = async function (startMoment, endMoment) {
    return toDaysRange(startMoment, endMoment)
      .filter(day => !isWeekDay(day, this.workingDays))
  }

  this.festiveDaysIn = async function (startMoment, endMoment) {
    return axios.get('https://www.googleapis.com/calendar/v3/calendars/en.' + this.locale + '%23holiday%40group.v.calendar.google.com/events?key=' + this.API_KEY)
      .then(response => {
        return response.data.items
          .reduce(removeDuplicateFestivities, [])
          .map(toDaysRangeExcludingLast)
          .flat()
          .filter(day => day >= startMoment && day <= endMoment)
      }).catch(_ => {
        console.log('WARNING: Error while retreiving festive days. They wont be skipped.')
        return []
      })
  }

  function toDaysRangeExcludingLast (it) {
    const startDay = moment(it.start.date)
    const endDay = moment(it.end.date).add(-1, 'day')
    return toDaysRange(startDay, endDay)
  }

  function toDaysRange (startMoment, endMoment) {
    var currentDay = moment(startMoment).startOf('day')
    const endDay = moment(endMoment).startOf('day')

    const daysList = []
    while (currentDay <= endDay) {
      daysList.push(moment(currentDay.format('YYYY-MM-DD')))
      currentDay = currentDay.add(1, 'day')
    }
    return daysList
  }

  function removeDuplicateFestivities (acc, curr) {
    if (acc.filter(it => it.start.date === curr.start.date).length === 0) { acc.push(curr) }
    return acc
  }

  function isWeekDay (day, workingDays) {
    return workingDays.some(working => working === day.format('dddd'))
  }

  function isNotFestive (day, festiveDays) {
    return !festiveDays.some(festive => festive.diff(day) === 0)
  }
}

Array.prototype.flat = function () {
  return [].concat(...this)
}
