import { Class } from 'everyday-types'
import { cheapRandomId, debugObjectMethods } from 'everyday-utils'
import { createOrReturn, List } from '@stagas/immutable-list'

// export type ItemDetail = Record<string, unknown>

export class BasePreset<T extends AbstractDetail<any> = any> {
  id = cheapRandomId()
  detail!: T

  isIntent = false
  isDraft = true
  isRemoved = false

  constructor(data: Partial<BasePreset<T>>) {
    Object.assign(this, data)
  }

  equals(other?: BasePreset) {
    if (this === other) return true

    return !other
      || (this.id === other.id
        && this.isIntent === other.isIntent
        && this.isDraft === other.isDraft
        && this.isRemoved === other.isRemoved
        && this.detail.equals(other.detail))
  }
}

export abstract class AbstractDetail<T = any> {
  data: T

  constructor(data: T | AbstractDetail<T>) {
    if (data instanceof AbstractDetail) {
      this.data = data.data
    } else {
      this.data = data
    }
  }

  abstract merge(other: this | this['data']): any
  abstract equals(other: this | this['data']): boolean
  abstract satisfies(other: this | this['data']): boolean

  toJSON() {
    return this.data
  }

  copy(): T {
    // @ts-ignore
    return new this.constructor(this.toJSON())
  }
}

export interface BasePresetsEvents<Preset, Detail> {
  select: (
    next: Preset | null,
    prev: Preset | null,
    nextDetail: Detail | null | undefined,
    prevDetail: Detail | null,
    byClick: boolean | undefined,
    byGroup: boolean | undefined
  ) => void
}

export abstract class BasePresets<
  Detail extends AbstractDetail = any,
  Preset extends BasePreset<Detail> = BasePreset<Detail>,
  PresetClass extends Class<Preset> = Class<Preset>,
> extends List<Preset, BasePresetsEvents<Preset, Detail>> {
  spare: { index: number, preset: Preset } | null = null
  selectedPresetId: string | false = false

  constructor(
    data: Partial<BasePresets<Detail, Preset, PresetClass>> = {},
    public Preset: PresetClass = BasePreset as any,
    public Detail: Class<Detail> = class extends AbstractDetail {
      equals(next?: Detail, prev?: Detail) { return true }
      satisfies(other: Detail) { return true }
      merge(other: Partial<Detail>) { return this }
    } as any
  ) {
    super(data)
    Object.assign(this, data)
    this.ctor = new.target as any
    debugObjectMethods(this, ['valueOf', 'toJSON'], {
      before: (key, args, stackErr) => {
        console.groupCollapsed(key)
        console.groupCollapsed('ARGS:', args)
        console.log(stackErr)
        console.groupEnd()
      },
      after: (key, args, result) => {
        console.log('RESULT:', result)
        console.groupEnd()
      }
    }, 'abstract-presets')
  }

  toJSON() {
    return {
      items: this.items,
      spare: this.spare,
      selectedPresetId: this.selectedPresetId,
      // @ts-ignore
      listeners: this.listeners
    } as any
  }

  equals(other: BasePresets<Detail, Preset, PresetClass>) {
    if (this === other) return true
    return this.items.length === other.items.length
      && this.selectedPresetId === other.selectedPresetId
      && (
        !this.selectedPresetId
        || this.selectedPreset!.equals(other.selectedPreset!)
      )
      && this.items.every((a) =>
        other.items.some((b) => a.equals(b))
      )
  }

  get selectedPreset() {
    try {
      return this.selectedPresetId ? this.getById(this.selectedPresetId) : null
    } catch (error) {
      console.warn(error)
      return null
    }
  }

  createWithDetail(detail: Detail['data'], presetData: Partial<Preset> = {}) {
    return new this.Preset({ ...presetData, detail })
  }

  createWithDetailData(data: Detail['data'], presetData?: Partial<Preset>) {
    return this.createWithDetail(new this.Detail(data), presetData)
  }

  restoreSpare(newDetail: Detail, bySelect?: boolean) {
    let presets = this

    // go to the last draft if there is one
    const spare = this.spare
    if (spare && !spare.preset.isIntent) {
      if (spare.preset.isDraft) {
        if (!presets.hasId(spare.preset.id)) {
          presets = presets.insertAt(
            presets.items.length
            // spare.index
            , spare.preset)
        }

        presets = presets
          .selectPreset(spare.preset.id, false, newDetail)

        return presets
      }
    }
  }

  getByDetail(detail: Detail): Preset | undefined {
    const candidates =
      this.items.filter((preset) =>
        preset.detail?.satisfies(detail))

    const nonDraft =
      candidates.find((preset) =>
        !preset.isDraft)

    return nonDraft ?? candidates[0]
  }

  insertAt(index: number, newPreset: Preset) {
    index = Math.max(-1, Math.min(this.items.length, index))
    const res = super.insertAt(index, newPreset)
    res.spare = { index, preset: newPreset }
    return res
  }

  removeById(presetId: string, fallbackPresetId?: string) {
    // const preset = this.getById(presetId)
    // const index = this.items.indexOf(preset)

    let presets = super.removeById(presetId)

    // presets.spare = { index, preset }

    const nextPresetId = presets.selectedPresetId === presetId
      ? fallbackPresetId && this.hasId(fallbackPresetId)
        ? fallbackPresetId
        : false
      : presets.selectedPresetId

    if (nextPresetId !== presetId) {
      presets = presets
        .selectPreset(nextPresetId, false)
    }

    // presets = createOrReturn(
    //   this.ctor,
    //   presets,
    //   'selectedPresetId',
    //   presets.selectedPresetId === presetId
    //     ? fallbackPresetId && this.hasId(fallbackPresetId)
    //       ? fallbackPresetId
    //       : false
    //     : presets.selectedPresetId
    // )

    return presets
  }

  setDetailData(newDetailData: Detail['data'], bySelect = false, byIntent = false, byGroup = false) {
    let presets = this
    const newDetail = new this.Detail(newDetailData)

    if (!presets.selectedPresetId) {
      const res = presets.restoreSpare(newDetail)
      if (res) return res

      const preset = new this.Preset({ detail: newDetail, isIntent: byIntent }) as Preset
      return presets
        .insertAt(presets.items.length, preset)
        .selectPreset(preset.id)
    }

    // get selected preset
    const current = presets.selectedPreset

    // merge current preset detail with our incoming new detail patch
    const mergedDetail = current?.detail.merge({ ...current.detail.data, ...newDetail.data })

    // search presets for the new detail
    const preset = presets.getByDetail(mergedDetail)

    if (preset) {
      if (!mergedDetail.equals(preset.detail)) {
        presets = presets.updateById(preset.id, {
          detail: mergedDetail
        } as Preset)
      }
    }

    // if there is a preset //
    if (preset
      && current
      && (current === preset
        || (!(current.isDraft && current.isIntent && preset.isDraft))
      )
    ) {
      // and it's not the currently selected
      if (bySelect || presets.selectedPresetId !== preset.id) {
        presets = presets.selectPreset(preset.id, bySelect)

        // remove unintentional drafts that were not interacted with
        if (!byIntent && !bySelect) for (const [, p] of presets.items.entries()) {
          if (p !== preset && p.isDraft && !p.isIntent) {
            // presets.draft = { index, preset: p }
            presets = presets.removeById(p.id)
          }
        } else {
          presets = presets.mergeEach({ isIntent: true } as Preset)
        }

        return presets
      }

      // if it's selected but a draft, do nothing because same details,
      // only update draft (TODO: is this necessary?)
      if (preset.isDraft) {
        // presets.draft = { index: presets!.items.indexOf(preset), preset }
        return presets
      }

      // we have a preset that matches the selected one.
      return presets
    }

    // otherwise insert a new preset after the selected one
    // const index = presets!.items.indexOf(current!)

    // if it's a draft, update it and return
    if (current?.isDraft) {
      // presets.draft = { index, preset: current }
      return presets.selectPreset(current.id, false, newDetail, byGroup)
    }

    const res = presets.restoreSpare(newDetail, bySelect)
    if (res) return res

    const newPreset = new this.Preset({ detail: mergedDetail, isIntent: byIntent }) as Preset

    return presets
      .insertAt(presets.items.length, newPreset)
      // .insertAfterIndex(index, newPreset)
      .selectPreset(newPreset.id)
  }


  selectPreset(nextPresetId: string | false, byClick?: boolean, newDetail?: Detail, byGroup?: boolean) {
    let presets = this

    if (byClick) {
      presets.spare = null
    }

    const prev = !nextPresetId || !presets.selectedPresetId
      ? null
      : presets.selectedPreset

    let next = !nextPresetId
      ? null
      : presets.getById(nextPresetId)

    const nextDetail =
      next && newDetail && next.detail.merge({ ...next.detail.data, ...newDetail.data })

    if (byClick) {
      presets = presets.mergeEach({ isIntent: true } as Preset)
    }

    if (nextPresetId && nextDetail) {
      presets = presets.updateById(nextPresetId, { detail: nextDetail } as Preset)
      next = presets.getById(nextPresetId)
      // prev = presets.selectedPreset
    }

    presets = createOrReturn(this.ctor, presets,
      'selectedPresetId',
      nextPresetId
    )

    queueMicrotask(function emitSelectEvent() {
      presets.emit('select', next, prev, next?.detail ?? null, prev?.detail ?? null, byClick, byGroup)
    })

    return presets
  }

  renamePresetRandom(presetId: string, useEmoji?: boolean | undefined): void { }

  savePreset(presetId: string) {
    const presets = this.updateById(presetId, {
      isDraft: false
    } as Preset)

    if (presets.spare?.preset?.id === presetId) {
      presets.spare = null
    }

    return presets
  }
}
