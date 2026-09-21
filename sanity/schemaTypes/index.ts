import { benchmark } from "./benchmark"
import { crop } from "./crop"
import { farm } from "./farm"
import { field } from "./field"
import { observation } from "./observation"
import { pestReport } from "./pestReport"
import { season } from "./season"
import { treatment } from "./treatment"
import { weatherSnapshot } from "./weatherSnapshot"

export const schemaTypes = [
  farm,
  field,
  crop,
  season,
  treatment,
  pestReport,
  observation,
  weatherSnapshot,
  benchmark,
]
