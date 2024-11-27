<script lang="ts">
  import RandomDocPlugin from "../index"
  import { onMount } from "svelte"
  import StoreConfig from "../models/StoreConfig"
  import { storeName } from "../Constants"
  import { showMessage } from "siyuan"

  // props
  export let pluginInstance: RandomDocPlugin
  export let dialog

  let storeConfig: StoreConfig
  let showLoading = false

  const onSaveSetting = async () => {
    dialog.destroy()

    storeConfig.showLoading = showLoading
    await pluginInstance.saveData(storeName, storeConfig)

    showMessage(`${pluginInstance.i18n.settingConfigSaveSuccess}`, 2000, "info")
  }

  const onCancel = async () => {
    dialog.destroy()
  }

  onMount(async () => {
    storeConfig = await pluginInstance.loadData(storeName)
    showLoading = storeConfig?.showLoading ?? false
  })
</script>

<div class="random-doc-setting">
  <div class="config__tab-container">
    <div class="fn__block form-item">
      {pluginInstance.i18n.showLoading}
      <div class="b3-label__text form-item-tip">{pluginInstance.i18n.showLoadingTip}</div>
      <span class="fn__hr" />
      <input class="b3-switch fn__flex-center" id="syncCss" type="checkbox" bind:checked={showLoading} />
    </div>

    <div class="b3-dialog__action">
      <button class="b3-button b3-button--cancel" on:click={onCancel}>{pluginInstance.i18n.cancel}</button>
      <div class="fn__space" />
      <button class="b3-button b3-button--text" on:click={onSaveSetting}>{pluginInstance.i18n.save}</button>
    </div>
  </div>
</div>

<style>
  .form-item {
    padding: 10px;
    width: 94%;
    margin: auto;
    font-size: 14px;
  }

  .form-item-tip {
    font-size: 12px !important;
    color: var(--b3-theme-on-background);
  }
</style>
