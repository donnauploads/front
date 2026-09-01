import * as mock from "../mocks/avatar.mock"
import * as real from "./avatar.real"
import { useMocks } from "@/lib/dev/use-mocks-flag"

export const uploadAvatar = useMocks ? mock.uploadAvatar : real.uploadAvatar
export const removeAvatar = useMocks ? mock.removeAvatar : real.removeAvatar

// Constants + types are not implementation-specific.
export {
  ACCEPTED_AVATAR_TYPES,
  MAX_AVATAR_BYTES,
} from "../mocks/avatar.mock"
export type { UploadAvatarResult } from "../mocks/avatar.mock"
