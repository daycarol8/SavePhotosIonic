import { Platform } from '@ionic/angular';
import { Photo } from './../models/photo';
import { Injectable } from '@angular/core';
import { Plugins, CameraResultType, Capacitor, FilesystemDirectory, CameraPhoto, CameraSource } from '@capacitor/core';
import { promise } from 'protractor';

const {Camera, FileSystem, Storage} = Plugins;

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  public photos: Photo[] = [];
  private PHOTO_STORAGE = 'photos';
  private platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
   }

  public async loadSaved(){
    const photoList = await Storage.get({
      key: this.PHOTO_STORAGE
    });
    this.photos = JSON.parse(photoList.value) || [];

    if (!this.platform.is('hybrid')){
      for (const photo of this.photos){
        const readFile = await FileSystem.readFile({
          path: photo.filepath,
          directory: FilesystemDirectory.Data
        });
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  public async addNewToGallery() {
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);
    Storage.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });
  }

  private async savePicture(cameraPhoto: CameraPhoto){
    const base64Data = await this.readAsBase64(cameraPhoto);

    const fileName = new Date().getTime() + '.jpg';
    const savedFile = await FileSystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data
    });

    if (this.platform.is('hybrid')){
      return{
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri)
      };
    }
    else{
      return{
        filepath: fileName,
        webviewPath: cameraPhoto.webPath
      };
    }
  }

   private async readAsBase64(cameraPhoto: CameraPhoto) {
    if (this.platform.is('hybrid')){
      const file = await FileSystem.readFile({
        path: cameraPhoto.path
      });
      return file.data;
    }
    else{
      const response = await fetch(cameraPhoto.webPath);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }

  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  })


}
