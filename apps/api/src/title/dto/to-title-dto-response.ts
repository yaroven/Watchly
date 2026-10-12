import toDtoResponseUtil from "../../common/utils/to-dto-response.util";
import { TitleResponseDto } from "./response/title-response.dto";

export default function toTitleDtoResponse(
  ...args: ConstructorParameters<typeof TitleResponseDto>
) {
  return toDtoResponseUtil(TitleResponseDto, ...args);
}
