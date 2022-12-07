// @env node

import { BasePresets, BasePreset, AbstractDetail, PresetsGroupData, PresetsGroupDetail } from '../src'

type DetailData = { x: string, y?: number, is?: string }

class CustomDetail extends AbstractDetail<
  DetailData
>{
  equals(other: this | this['data']) {
    if ('data' in other) other = other.data
    return !other ? false
      : this.data.x === other.x
      && this.data.y === other.y
  }

  satisfies(other: this | this['data']) {
    if ('data' in other) other = other.data
    return this.data.x === other.x
  }

  merge(other: this | this['data']) {
    if ('data' in other) other = other.data
    return new CustomDetail({ ...this.data, ...other })
  }
}

class Presets extends BasePresets<CustomDetail> {
  equals(other: Presets) {
    return true
  }
}

class PresetsGroup extends BasePresets<PresetsGroupDetail> {
  constructor(data: Partial<PresetsGroup>) {
    super(data, BasePreset, PresetsGroupDetail)
  }
}

describe('Presets', () => {
  it('new instance', () => {
    expect(new Presets()).toBeInstanceOf(BasePresets)
  })

  it('createWithDetail', () => {
    const presets = new Presets(
      {}, BasePreset, CustomDetail)
    //

    const a =
      presets.createWithDetailData({ x: 'a' })

    expect(a).toBeInstanceOf(BasePreset)
    expect(a.detail).toBeInstanceOf(AbstractDetail)
    expect(a.detail.data).toEqual({ x: 'a' })
  })

  it('insertAfterIndex creates draft same with preset', () => {
    const presets = new Presets(
      {}, BasePreset, CustomDetail)



    const a =
      presets.createWithDetailData({ x: 'a' })

    const res =
      presets.insertAt(0, a)

    expect(res.spare!.preset).toBe(a)
    expect(res.spare!.index).toBe(0)
    expect(res.items).toEqual([a])

    // did not modify last copy
    expect(presets.spare).toBe(null)
  })

  it('creates instance with items data', () => {
    let presets =
      new Presets(
        {}, BasePreset, CustomDetail)

    const a =
      presets.createWithDetailData({ x: 'a' })

    const b =
      presets.createWithDetailData({ x: 'b' })

    const c =
      presets.createWithDetailData({ x: 'c' })

    presets = new Presets({ items: [a, b, c] },
      BasePreset, CustomDetail)

    expect(presets.items).toEqual([a, b, c])
  })

  it('getByDetail', () => {
    let presets =
      new Presets({}, BasePreset, CustomDetail)

    const a =
      presets.createWithDetailData({ x: 'a' })

    const b =
      presets.createWithDetailData({ x: 'b' })

    const c =
      presets.createWithDetailData({ x: 'c' })

    presets = new Presets({ items: [a, b, c] },
      BasePreset, CustomDetail)

    expect(presets.getByDetail(
      new CustomDetail({ x: 'a' }))).toBe(a)
    expect(presets.getByDetail(
      new CustomDetail({ x: 'b' }))).toBe(b)
    expect(presets.getByDetail(
      new CustomDetail({ x: 'c' }))).toBe(c)
    expect(presets.getByDetail(
      new CustomDetail({ x: 'd' }))).toBeUndefined()
  })

  it('savePreset marks isDraft=false', () => {
    let presets =
      new Presets(
        {}, BasePreset, CustomDetail)

    const a =
      presets.createWithDetailData({ x: 'a' })

    presets = new Presets({ items: [a] }, BasePreset, CustomDetail)


    expect(presets.items[0].isDraft).toBe(true)

    const res = presets.savePreset(a.id)
    expect(res.items[0].isDraft).toBe(false)
    // did not modify last copy
    expect(presets.items[0].isDraft).toBe(true)
  })


  it('getByDetail fetches first if detail match many', () => {
    let presets =
      new Presets({}, BasePreset, CustomDetail)



    const a =
      presets.createWithDetailData({ x: 'a', is: 'a' })

    const b =
      presets.createWithDetailData({ x: 'a', is: 'b' })

    presets = new Presets({ items: [a, b] })



    expect(presets.getByDetail(
      new CustomDetail({ x: 'a' }))).toBe(presets.items[0])
  })

  it('getByDetail fetches non-draft if detail match many', () => {
    let presets =
      new Presets({}, BasePreset, CustomDetail)



    const a =
      presets.createWithDetailData({ x: 'a', is: 'a' })

    const b =
      presets.createWithDetailData({ x: 'a', is: 'b' })

    presets = new Presets({ items: [a, b] })



    const res = presets.savePreset(b.id)
    expect(res.getByDetail(
      new CustomDetail({ x: 'a' }))).toBe(res.items[1])

    // did not modify last copy
    expect(presets.getByDetail(
      new CustomDetail({ x: 'a' }))).toBe(presets.items[0])
  })

  it('selectPreset', () => {
    let presets =
      new Presets({}, BasePreset, CustomDetail)



    const a =
      presets.createWithDetailData({ x: 'a' })

    const b =
      presets.createWithDetailData({ x: 'b' })

    const c =
      presets.createWithDetailData({ x: 'c' })

    presets = new Presets({ items: [a, b, c] })



    const A =
      presets.selectPreset(a.id)

    expect(A.selectedPresetId).toBe(a.id)

    const B =
      A.selectPreset(b.id)

    expect(B.selectedPresetId).toBe(b.id)

    // can go to undefined
    const C =
      B.selectPreset(false)

    expect(C.selectedPresetId).toBe(false)
  })

  it('selectPreset emits event select in microtask, reuses listener', async () => {
    let presets =
      new Presets({}, BasePreset, CustomDetail)



    const a =
      presets.createWithDetailData({ x: 'a' })

    const b =
      presets.createWithDetailData({ x: 'b' })

    const c =
      presets.createWithDetailData({ x: 'c' })

    presets = new Presets({ items: [a, b, c] })



    const onSelect = jest.fn()
    presets.on('select', onSelect)

    const A =
      presets.selectPreset(a.id)

    await Promise.resolve()

    expect(A.selectedPresetId).toBe(a.id)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(a, null, a.detail, null, undefined, undefined)

    const B =
      A.selectPreset(b.id)

    await Promise.resolve()

    expect(B.selectedPresetId).toBe(b.id)
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith(b, a, b.detail, a.detail, undefined, undefined)

    // @ts-ignore
    expect(A.listeners).toBe(B.listeners)
  })

  it('selectPreset with new detail merges', () => {
    let presets =
      new Presets({}, BasePreset, CustomDetail)



    const a =
      presets.createWithDetailData({ x: 'a' })

    presets = new Presets({ items: [a] })



    const A =
      presets.selectPreset(a.id, false, new CustomDetail({ x: 'a', y: 1 }))

    expect(A.selectedPresetId).toBe(a.id)
    expect(A.items[0].detail.data).toEqual({
      x: 'a',
      y: 1
    })
  })

  it('selectPreset byClick sets isIntent=true to all', () => {
    let presets =
      new Presets({}, BasePreset, CustomDetail)



    const a =
      presets.createWithDetailData({ x: 'a' })

    const b =
      presets.createWithDetailData({ x: 'b' })

    const c =
      presets.createWithDetailData({ x: 'c' })

    presets = new Presets({ items: [a, b, c] })



    const A =
      presets.selectPreset(a.id)

    expect(A.getById(a.id).isIntent).toBe(false)
    expect(A.getById(b.id).isIntent).toBe(false)
    expect(A.getById(c.id).isIntent).toBe(false)

    const B =
      A.selectPreset(b.id, true)

    expect(B.getById(a.id).isIntent).toBe(true)
    expect(B.getById(b.id).isIntent).toBe(true)
    expect(B.getById(c.id).isIntent).toBe(true)
  })

  describe('setDetailData', () => {
    it('updates currently selected preset merging detail data', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      const a =
        presets.createWithDetailData({ x: 'a' })

      presets = new Presets({ items: [a] })



      const A =
        presets.selectPreset(a.id)


      const B =
        A.setDetailData({ x: 'a', y: 1 })

      expect(B!.items[0].detail.data).toEqual({
        x: 'a',
        y: 1
      })

      // did not modify previous
      expect(A!.items[0].detail.data).toEqual({
        x: 'a'
      })
    })

    it('inserts with new data when none selected', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      presets = new Presets()



      const A =
        presets.setDetailData({ x: 'a', y: 1 })

      expect(A!.items[0].detail.data).toEqual({
        x: 'a',
        y: 1
      })
      expect(A!.selectedPresetId).toBe(A!.items[0].id)
    })

    it('inserts with new data when none selected', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      presets = new Presets()



      const A =
        presets.setDetailData({ x: 'a', y: 1 })

      expect(A!.items[0].detail.data).toEqual({
        x: 'a',
        y: 1
      })
      expect(A!.selectedPresetId).toBe(A!.items[0].id)
    })

    xit('creates new when created one and then deselected', () => {
      const presets =
        new Presets({}, BasePreset, CustomDetail)



      const A =
        presets.setDetailData({ x: 'a', y: 1 })

      const a = A!.items[0]
      expect(a.detail.data).toEqual({
        x: 'a',
        y: 1
      })

      expect(A!.selectedPresetId).toBe(a.id)

      const B =
        A!.selectPreset(false)

      expect(B.selectedPresetId).toBe(false)

      const C =
        B.setDetailData({ x: 'a', y: 2 })

      expect(C!.selectedPresetId).not.toBe(a.id)

      const a2 = C!.items[1]

      expect(a2.detail.data).toEqual({
        x: 'a',
        y: 2
      })

      const a3 = C!.items[0]

      expect(a3.detail.data).toEqual({
        x: 'a',
        y: 1
      })

      expect(C!.items.length).toBe(2)
    })

    it('finds preset when same data and that IS NOT a draft and this IS NOT a draft, and selects it', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      const a =
        presets.createWithDetailData({ x: 'a' })

      const b =
        presets.createWithDetailData({ x: 'b' })

      presets = new Presets({ items: [a, b] })



      const A =
        presets
          .savePreset(a.id)
          .savePreset(b.id)
          .selectPreset(a.id)

      const B =
        A.setDetailData({ x: 'b' })

      expect(B?.selectedPresetId).toEqual(b.id)
    })

    it('discards this preset when same data and that IS NOT a draft and this IS a draft', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      const a =
        presets.createWithDetailData({ x: 'a' })

      const b =
        presets.createWithDetailData({ x: 'b' })

      presets = new Presets({ items: [a, b] })



      const A =
        presets
          .savePreset(b.id)
          .selectPreset(a.id)

      expect(A?.items.length).toBe(2)

      const B =
        A.setDetailData({ x: 'b' })

      expect(B?.selectedPresetId).toEqual(b.id)
      expect(B?.items.length).toBe(1)
    })

    xit('discards this preset when same data and that IS NOT a draft and this IS a draft, then restores the draft when data changes', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      const a =
        presets.createWithDetailData({ x: 'a' })

      const b =
        presets.createWithDetailData({ x: 'b' })

      presets = new Presets({ items: [a, b] })



      const A =
        presets
          .savePreset(b.id)
          .selectPreset(a.id)

      expect(A?.items.length).toBe(2)

      const B =
        A.setDetailData({ x: 'b' })

      expect(B?.selectedPresetId).toEqual(b.id)
      expect(B?.items.length).toBe(1)

      const C =
        B!.setDetailData({ x: 'c' })

      expect(C?.selectedPresetId).toEqual(a.id)
      expect(C?.items.length).toBe(2)
      expect(C?.items.findIndex((x) => x.id === a.id)).toBe(0)
    })

    it('does not discard presets when same data and that IS NOT a draft and this IS a draft but called with isIntent=true', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      const a =
        presets.createWithDetailData({ x: 'a' })

      const b =
        presets.createWithDetailData({ x: 'b' })

      presets = new Presets({ items: [a, b] })



      const A =
        presets
          .savePreset(b.id)
          .selectPreset(a.id)

      expect(A?.items.length).toBe(2)
      expect(A?.items[0].isIntent).toBe(false)

      const B =
        A.setDetailData({ x: 'b' }, false, true)

      expect(B?.selectedPresetId).toEqual(b.id)
      expect(B?.items.length).toBe(2)
      expect(B?.items[0].isIntent).toBe(true)
    })


    it('reuses preset when same data and that IS a draft and this IS NOT a draft, and selects it', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      const a =
        presets.createWithDetailData({ x: 'a' })

      const b =
        presets.createWithDetailData({ x: 'b' })

      presets = new Presets({ items: [a, b] })


      const A =
        presets
          .savePreset(a.id)
          .selectPreset(b.id)

      const B =
        A.setDetailData({ x: 'b' })

      expect(B?.selectedPresetId).toEqual(b.id)

      const C =
        B!.setDetailData({ x: 'b' })

      expect(C?.selectedPresetId).toEqual(b.id)
    })

    it('updates current if it IS a draft', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)



      const a =
        presets.createWithDetailData({ x: 'a' })

      presets = new Presets({ items: [a] })


      const A =
        presets.selectPreset(a.id)

      const B =
        A.setDetailData({ x: 'a', y: 1 })

      expect(B!.items[0].detail.data).toEqual({
        x: 'a',
        y: 1
      })

      const C =
        B.setDetailData({ x: 'b', y: 2 })

      expect(C!.items.length).toBe(1)
      expect(C!.items[0].detail.data).toEqual({
        x: 'b',
        y: 2
      })

      expect(C!.items[0].id).toBe(a.id)
    })

    it('creates new if it IS NOT a draft', () => {
      let presets =
        new Presets({}, BasePreset, CustomDetail)

      const a =
        presets.createWithDetailData({ x: 'a' })

      presets = new Presets({ items: [a] })

      const A =
        presets.selectPreset(a.id)

      const B =
        A.setDetailData({ x: 'a', y: 1 })
          .savePreset(a.id)

      expect(B!.items.length).toBe(1)
      expect(B!.items[0].detail.data).toEqual({
        x: 'a',
        y: 1
      })

      const C =
        B.setDetailData({ x: 'b', y: 2 })

      expect(C!.items.length).toBe(2)
      expect(C!.items[1].detail.data).toEqual({
        x: 'b',
        y: 2
      })

      expect(C!.items[1].id).not.toBe(a.id)
    })
  })

  describe('removeById', () => {
    it('removes preset by id', () => {
      let presets =
        new Presets(
          {}, BasePreset, CustomDetail)


      const a =
        presets.createWithDetailData({ x: 'a' })

      const b =
        presets.createWithDetailData({ x: 'b' })

      const c =
        presets.createWithDetailData({ x: 'c' })

      presets = new Presets({ items: [a, b, c] },
        BasePreset, CustomDetail)


      expect(presets.items).toEqual([a, b, c])

      const A = presets.removeById(b.id)
      expect(A.items).toEqual([a, c])
    })

    it('removes preset and deselects if preset was selected', () => {
      let presets =
        new Presets(
          {}, BasePreset, CustomDetail)


      const a =
        presets.createWithDetailData({ x: 'a' })

      const b =
        presets.createWithDetailData({ x: 'b' })

      const c =
        presets.createWithDetailData({ x: 'c' })

      presets = new Presets({ items: [a, b, c] },
        BasePreset, CustomDetail)


      expect(presets.items).toEqual([a, b, c])

      const A =
        presets.selectPreset(b.id)

      expect(A.selectedPresetId).toEqual(b.id)

      const B =
        A.removeById(b.id)

      expect(B.selectedPresetId).toEqual(false)
    })
  })

  describe('PresetGroupDetail', () => {
    it('works', () => {
      const sources: PresetsGroupData['sources'] = new Map([
        ['a', new Presets(
          {}, BasePreset, CustomDetail)],
        ['b', new Presets(
          {}, BasePreset, CustomDetail)]
      ])

      const preset = new BasePreset({
        detail: new PresetsGroupDetail({ sources: new Map(), details: [] })
      })

      const presets = new PresetsGroup({
        items: [preset],
        selectedPresetId: preset.id
      })

      const A =
        presets.selectedPreset!.detail.collectData(sources)!

      expect(A.data.details).toEqual([])
      expect(A.data.sources).toEqual(sources)
    })

    it('collectData', () => {
      const sources: PresetsGroupData['sources'] = new Map([
        ['a', new Presets(
          {}, BasePreset, CustomDetail)],
        ['b', new Presets(
          {}, BasePreset, CustomDetail)]
      ])

      sources.set('a', sources.get('a')!.setDetailData({ x: 'a' }))
      sources.set('b', sources.get('b')!.setDetailData({ x: 'b' }))

      const preset = new BasePreset({
        detail: new PresetsGroupDetail({ sources: new Map(), details: [] })
      })

      const presets = new PresetsGroup({
        items: [preset],
        selectedPresetId: preset.id
      })

      const detail =
        presets.selectedPreset?.detail.collectData(sources)

      expect(detail?.data.details).toEqual([
        ['a', new CustomDetail({ x: 'a' })],
        ['b', new CustomDetail({ x: 'b' })]
      ])
    })

    it('applyData', () => {
      let sources: PresetsGroupData['sources'] = new Map([
        ['a', new Presets(
          {}, BasePreset, CustomDetail)],
        ['b', new Presets(
          {}, BasePreset, CustomDetail)]
      ])

      sources.set('a', sources.get('a')!.setDetailData({ x: 'a' }))
      sources.set('b', sources.get('b')!.setDetailData({ x: 'b' }))

      const preset = new BasePreset({
        detail: new PresetsGroupDetail({ sources: new Map(), details: [] })
      })

      const presets = new PresetsGroup({
        items: [preset],
        selectedPresetId: preset.id
      })

      const detail =
        presets.selectedPreset!.detail.collectData(sources)!

      expect(detail?.data.details).toEqual([
        ['a', new CustomDetail({ x: 'a' })],
        ['b', new CustomDetail({ x: 'b' })]
      ])

      sources.set('a', sources.get('a')!.setDetailData({ x: 'a2' }))
      sources.set('b', sources.get('b')!.setDetailData({ x: 'b2' }))

      expect(sources!.get('a')?.items.length).toEqual(1)
      expect(sources!.get('b')?.items.length).toEqual(1)
      expect(sources!.get('a')?.items[0].detail.data).toEqual(
        { x: 'a2' }
      )
      expect(sources!.get('b')?.items[0].detail.data).toEqual(
        { x: 'b2' }
      )

      expect(detail.applyData(
        new PresetsGroupDetail({ details: [] }).data
      )).toEqual(new Map())

      sources = detail.applyData(detail.data)

      expect(sources!.get('a')?.items.length).toEqual(1)
      expect(sources!.get('b')?.items.length).toEqual(1)
      expect(sources!.get('a')?.items[0].detail.data).toEqual(
        { x: 'a' }
      )
      expect(sources!.get('b')?.items[0].detail.data).toEqual(
        { x: 'b' }
      )
    })

    it('satisfies/equals', () => {
      const sources: PresetsGroupData['sources'] = new Map([
        ['a', new Presets(
          {}, BasePreset, CustomDetail)],
        ['b', new Presets(
          {}, BasePreset, CustomDetail)]
      ])

      sources.set('a', sources.get('a')!
        .setDetailData({ x: 'a', y: 1 }))
      sources.set('b', sources.get('b')!
        .setDetailData({ x: 'b', y: 2 }))

      const preset = new BasePreset({
        detail: new PresetsGroupDetail({
          sources: new Map(), details: []
        })
      })

      const presets =
        new PresetsGroup({
          items: [preset],
          selectedPresetId: preset.id
        })

      const A =
        presets.selectedPreset!.detail.collectData(sources)!

      expect(A.data.details).toEqual([
        ['a', new CustomDetail({ x: 'a', y: 1 })],
        ['b', new CustomDetail({ x: 'b', y: 2 })]
      ])

      sources.set('a', sources.get('a')!
        .setDetailData({ x: 'a', y: 11 }))
      sources.set('b', sources.get('b')!
        .setDetailData({ x: 'b', y: 22 }))

      const B =
        presets.selectedPreset!.detail.collectData(sources)!

      expect(A.satisfies(B)).toEqual(true)
      expect(A.satisfies(B.data)).toEqual(true)
      expect(A.satisfies(void 0)).toEqual(false)
      expect(A.equals(B)).toEqual(false)
      expect(A.equals(B.data)).toEqual(false)
      expect(A.equals(void 0)).toEqual(false)
    })

    it('merge', () => {
      const sources: PresetsGroupData['sources'] = new Map([
        ['a', new Presets(
          {}, BasePreset, CustomDetail)],
        ['b', new Presets(
          {}, BasePreset, CustomDetail)]
      ])

      sources.set('a', sources.get('a')!
        .setDetailData({ x: 'a', y: 1 }))
      sources.set('b', sources.get('b')!
        .setDetailData({ x: 'b', y: 2 }))

      const preset = new BasePreset({
        detail: new PresetsGroupDetail({
          sources: new Map(), details: []
        })
      })

      const presets = new PresetsGroup({
        items: [preset],
        selectedPresetId: preset.id
      })

      const A =
        presets.selectedPreset!.detail.collectData(sources)!

      expect(A.data.details).toEqual([
        ['a', new CustomDetail({ x: 'a', y: 1 })],
        ['b', new CustomDetail({ x: 'b', y: 2 })]
      ])

      sources.set('a', sources.get('a')!
        .setDetailData({ x: 'a', y: 11 }))
      sources.set('b', sources.get('b')!
        .setDetailData({ x: 'b', y: 22 }))

      const B =
        presets.selectedPreset!.detail.collectData(sources)!

      expect(A.satisfies(B)).toEqual(true)
      expect(A.equals(B)).toEqual(false)
      const C = A.merge(B)
      expect(C.satisfies(B)).toEqual(true)
      expect(C.equals(B)).toEqual(true)
    })

    it('should save preset and satisfy same data', () => {
      const sources: PresetsGroupData['sources'] = new Map([
        ['a', new Presets(
          {}, BasePreset, CustomDetail)],
        ['b', new Presets(
          {}, BasePreset, CustomDetail)]
      ])

      sources.set('a', sources.get('a')!
        .setDetailData({ x: 'a', y: 1 }))
      sources.set('b', sources.get('b')!
        .setDetailData({ x: 'b', y: 2 }))

      const preset = new BasePreset({
        detail: new PresetsGroupDetail({
          sources: new Map(), details: []
        })
      })

      const presets = new PresetsGroup({
        items: [preset],
        selectedPresetId: preset.id
      })

      const A =
        presets.selectedPreset!.detail.collectData(sources)!

      expect(A.data.details).toEqual([
        ['a', new CustomDetail({ x: 'a', y: 1 })],
        ['b', new CustomDetail({ x: 'b', y: 2 })]
      ])

      sources.set('a', sources.get('a')!
        .setDetailData({ x: 'a', y: 11 }))
      sources.set('b', sources.get('b')!
        .setDetailData({ x: 'b', y: 22 }))

      const B =
        presets.selectedPreset!.detail.collectData(sources)!

      const X = presets.setDetailData(B.data)
      expect(X.items.length).toBe(1)
      expect(X.items[0].detail.data.details[0][1].data)
        .toEqual({ x: 'a', y: 11 })
      expect(X.items[0].detail.data.details[1][1].data)
        .toEqual({ x: 'b', y: 22 })

      const Y = X
        .savePreset(X.selectedPresetId as string)
        .setDetailData(B.data)

      expect(Y.items.length).toBe(1)
      expect(Y.items[0].detail.data.details[0][1].data)
        .toEqual({ x: 'a', y: 11 })
      expect(Y.items[0].detail.data.details[1][1].data)
        .toEqual({ x: 'b', y: 22 })

      // expect(A.satisfies(B)).toEqual(true)
      // expect(A.equals(B)).toEqual(false)
      // const C = A.merge(B)
      // expect(C.satisfies(B)).toEqual(true)
      // expect(C.equals(B)).toEqual(false)
    })
  })
})
