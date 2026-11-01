import { describe, expect, it, vi } from "vitest";
import { uploadImageFile } from "./upload-media";

const fileList = (file: File) => ({ 0: file, length: 1, item: () => file }) as unknown as FileList;

describe("uploadImageFile", () => {
  it("confirms the upload with the key it was issued, only after the PUT", async () => {
    const calls: string[] = [];
    const file = new File(["x"], "poster.png", { type: "image/png" });

    await uploadImageFile({
      files: fileList(file),
      getUploadUrl: async (contentType) => {
        calls.push(`url:${contentType}`);
        return { uploadUrl: "https://s3/put", rawKey: "title-poster/t-1/a1" };
      },
      uploadToUrl: async (url) => {
        calls.push(`put:${url}`);
      },
      completeUpload: async (rawKey) => {
        calls.push(`complete:${rawKey}`);
      },
    });

    expect(calls).toEqual(["url:image/png", "put:https://s3/put", "complete:title-poster/t-1/a1"]);
  });

  it("does not confirm an upload whose PUT failed", async () => {
    const completeUpload = vi.fn();

    await expect(
      uploadImageFile({
        files: fileList(new File(["x"], "p.png", { type: "image/png" })),
        getUploadUrl: async () => ({ uploadUrl: "https://s3/put", rawKey: "k" }),
        uploadToUrl: async () => {
          throw new Error("network");
        },
        completeUpload,
      }),
    ).rejects.toThrow("network");
    expect(completeUpload).not.toHaveBeenCalled();
  });

  it("does nothing without a file", async () => {
    const getUploadUrl = vi.fn();

    await expect(uploadImageFile({ files: null, getUploadUrl, uploadToUrl: vi.fn(), completeUpload: vi.fn() })).resolves.toBe(false);
    expect(getUploadUrl).not.toHaveBeenCalled();
  });
});
