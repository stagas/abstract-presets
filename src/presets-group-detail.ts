import { filterMap } from 'everyday-utils'
import { AbstractDetail, BasePresets } from './'

export interface PresetsGroupData {
  details: [string, AbstractDetail][]
  sources?: Map<string, BasePresets>
}
export class PresetsGroupDetail extends AbstractDetail<PresetsGroupData> {
  constructor(data: any) {
    super(data)
  }

  toJSON(): any {
    return {
      details: this.data.details
    }
  }

  collectData(sources: NonNullable<PresetsGroupData['sources']>) {
    // @ts-ignore
    return new this.constructor({
      sources: new Map(sources),
      details:
        filterMap(
          [...sources],
          ([id, presets]) =>
            !!presets.selectedPresetId
            && !!presets.selectedPreset?.detail
            && [id, presets.selectedPreset.detail.copy()]
        )
    })
  }

  applyData(data: PresetsGroupData): PresetsGroupData['sources'] {
    return !data.sources
      ? new Map()
      : new Map(filterMap(data.details,
        ([id, presetDetailData]) => {
          let presets =
            data.sources!.get(id)!

          if (
            !presets.selectedPreset
            || !presets.selectedPreset
              .detail.equals(presetDetailData)
          ) {
            presets = presets.setDetailData(presetDetailData, false, false, true)
          }
          return [id, presets]
        })
      )
  }

  equals(other?: this | this['data']) {
    if (other === this) {
      // console.warn('EXACTLY THE SAME', other, this)
      return true
    }

    const otherData =
      other && ('data' in other ? other.data : other)

    if (!otherData) {
      // console.log('NOT OTHER DATA', this)
      return false
    }

    const sameLength = this.data.details.length === otherData.details.length
    if (!sameLength) {
      // console.log('NOT SAME LENGTH', other, this)
      return false
    }

    const sameDetails = this.data.details.every(
      function everySameDetail(a) {
        return otherData.details
          .some(function areDetailsEqual(b) {
            return a[0] === b[0] && a[1].equals(b[1])
          })
      })

    if (!sameDetails) {
      // console.log('NOT SAME DETAIL', other, this)
      return false
    }

    return true
  }

  satisfies(other?: this | this['data']) {
    if (other === this) return true

    const otherData =
      other && ('data' in other ? other.data : other)

    if (!otherData) {
      return false
    }

    const satisfied = this.data.details.every(
      function satisfiesEvery(a) {
        return otherData.details
          .some(function satisfies(b) {
            return a[1].satisfies(b[1])
          })
      })

    if (!satisfied) {
      return false
    }

    return true
  }

  merge(other: this | this['data']) {
    const otherData = ('data' in other ? other.data : other)
    return new PresetsGroupDetail({
      sources: new Map(otherData.sources),
      details: otherData.details.map(
        ([key, detail]) =>
          [key, detail.copy()]
      )
    })
  }
}
