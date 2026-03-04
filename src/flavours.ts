interface Flavouring<FlavourT> {
  _type?: FlavourT;
}
export type Flavour<T, FlavourT> = T & Flavouring<FlavourT>;

export type Cells = Flavour<number, "Cells">;
export type Pixels = Flavour<number, "Pixels">;
