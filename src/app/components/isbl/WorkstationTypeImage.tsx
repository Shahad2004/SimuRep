import { getWorkstationImageUrl } from './workstationAssets';

type Props = {
  /** 0=cutting, 1=sewing, 2=quality, 3=packing (cycles for additional stations) */
  typeIndex: number;
  className?: string;
  title?: string;
};

export function WorkstationTypeImage({ typeIndex, className = 'w-14 h-14', title }: Props) {
  const src = getWorkstationImageUrl(typeIndex);

  return (
    <img
      src={src}
      alt=""
      title={title}
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}
