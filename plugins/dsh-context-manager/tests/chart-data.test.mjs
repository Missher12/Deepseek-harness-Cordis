import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composition, percentages, usageSlices } from '../lib/chart-data.js'

test('the full window includes unclassified occupancy and free capacity without repricing content', () => {
  assert.deepEqual(percentages([1, 1, 1]), [33.4, 33.3, 33.3])
  for (const values of [[123,456,789,20], [1,1,1,1,1,1,1], [0,8,3,1], [0,0,0,1]]) assert.equal(Math.round(percentages(values).reduce((a,b) => a+b,0) * 10), 1000)
  const data = { parts: [{category:'summary',tokens:30}, {category:'tool',tokens:20}, {category:'user',tokens:10}, {category:'assistant',tokens:10}, {category:'tools',tokens:5}, {category:'inject',tokens:5}], pressure: {window:100,projected:93}, pressureHistory: [] }
  const window = composition(data)
  assert.equal(window.content,80); assert.equal(window.used,93)
  assert.equal(window.total,100); assert.equal(window.slices.at(-1).value,7)
  assert.equal(window.slices.find(slice=>slice.id==='other').value,13)
  assert.equal(window.slices[0].share,30); assert.equal(window.slices[0].value,30)
  assert.equal(data.pressure.projected,93)
})

test('unknown windows do not invent free capacity; a known empty window is fully available', () => {
  const unknown=composition({parts:[],pressure:null,pressureHistory:[]})
  assert.equal(unknown.window,null); assert.equal(unknown.free,null)
  assert.equal(unknown.slices.some(slice=>slice.id==='free'),false)
  const empty=composition({parts:[],pressure:{window:128000,projected:0},pressureHistory:[]})
  assert.equal(empty.total,128000); assert.equal(empty.free,128000)
  assert.equal(empty.slices.at(-1).share,100)
})

test('1M capacity retains all K-sized buckets and uses recorded historical capacity', () => {
  const data={parts:[{category:'summary',tokens:30000},{category:'tool',tokens:200000},{category:'user',tokens:40000},{category:'assistant',tokens:10000},{category:'system',tokens:20000}],pressure:{window:1000000,projected:320000},pressureHistory:[]}
  const current=composition(data)
  assert.equal(current.window,1000000); assert.equal(current.free,680000)
  assert.deepEqual(current.slices.map(slice=>[slice.id,slice.value]),[['summary',30000],['tool',200000],['message',50000],['instruction',20000],['other',20000],['free',680000]])
  assert.equal(current.slices.reduce((sum,slice)=>sum+slice.value,0),1000000)
  const historical=composition({...data,parts:[{category:'summary',tokens:12000}],pressure:null,pressureHistory:[{seq:2,window:128000,tokens:22000}]})
  assert.equal(historical.window,128000); assert.equal(historical.used,22000); assert.equal(historical.free,106000)
})

test('larger text estimates never inflate available space; both estimates and overflow remain visible', () => {
  const chart=composition({parts:[{category:'summary',tokens:200}],pressure:{window:100,projected:150},pressureHistory:[]})
  assert.equal(chart.measured,150); assert.equal(chart.used,200)
  assert.equal(chart.overflow,true); assert.equal(chart.total,200); assert.equal(chart.free,0)
  assert.equal(chart.slices[0].value,200); assert.equal(chart.slices[0].share,100)
  const partial=composition({parts:[{category:'tool',tokens:80}],pressure:{window:100,projected:70},pressureHistory:[]})
  assert.equal(partial.free,20); assert.equal(partial.slices.some(slice=>slice.id==='other'),false)
})

test('session totals count disjoint cache buckets once and preserve unknown usage', () => {
  assert.equal(usageSlices(null),null)
  const chart=usageSlices({input:100,uncached:60,cacheRead:30,cacheWrite:10,output:20})
  assert.equal(chart.total,120); assert.equal(chart.hit,30)
  assert.deepEqual(chart.values,[60,30,10,20])
  assert.equal(usageSlices({input:0,uncached:0,cacheRead:0,cacheWrite:0,output:0}).hit,null)
})
