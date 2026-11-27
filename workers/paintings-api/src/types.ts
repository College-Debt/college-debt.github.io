export interface ViewerInfo {
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface GalleryPainting {
  slug: string;
  title: string;
  author: string;
  width: number;
  height: number;
  textureUrl: string;
  submittedBy: string | null;
  canEdit: boolean;
}

export interface PublishItemInput {
  title: string;
  author: string;
  width: number;
  height: number;
  scale: number;
  filenameHint?: string;
  pngBase64: string;
}

export interface PublishResultPainting {
  slug: string;
  title: string;
  author: string;
  width: number;
  height: number;
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
