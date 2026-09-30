import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composition, percentages, usageSlices } from '../lib/chart-data.js'

test('rounded compositions sum to 100 without changing token counts or mixing measured usage', () => {
  assert.deepEqual(percentages([1, 1, 1]), [33.4, 33.3, 33.3])
  for (const values of [[123,456,789,20], [1,1,1,1,1,1,1], [0,8,3,1], [0,0,0,1]]) assert.equal(Math.round(percentages(values).reduce((a,b) => a+b,0) * 10), 1000)
  const data = { parts: [{category:'summary',tokens:30}, {category:'tool',tokens:20}, {category:'user',tokens:10}, {category:'assistant',tokens:10}, {category:'tools',tokens:5}, {category:'inject',tokens:5}], pressure: {window:100,projected:93} }
  const content = composition(data, 'content')
  assert.equal(content.total, 80); assert.equal(content.slices[0].share, 37.5)
  const window = composition(data, 'window')
  assert.equal(window.total,100); assert.equal(window.slices.at(-1).value,20)
  assert.equal(window.slices[0].share,30); assert.equal(window.slices[0].value,30)
  assert.equal(data.pressure.projected,93)
})

test('unknown windows and empty content do not invent free capacity; overflow remains visible', () => {
  assert.equal(composition({parts:[],pressure:null},'window').total,0)
  assert.equal(composition({parts:[],pressure:{window:128000}},'window').total,0)
  const chart=composition({parts:[{category:'summary',tokens:200}],pressure:{window:100}},'window')
  assert.equal(chart.overflow,true); assert.equal(chart.total,200); assert.equal(chart.slices.at(-1).value,0)
  assert.equal(chart.slices[0].share,100)
})

test('session totals count disjoint cache buckets once and preserve unknown usage', () => {
  assert.equal(usageSlices(null),null)
  const chart=usageSlices({input:100,uncached:60,cacheRead:30,cacheWrite:10,output:20})
  assert.equal(chart.total,120); assert.equal(chart.hit,30)
  assert.deepEqual(chart.values,[60,30,10,20])
  assert.equal(usageSlices({input:0,uncached:0,cacheRead:0,cacheWrite:0,output:0}).hit,null)
})
