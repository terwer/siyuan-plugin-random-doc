<script lang="ts">
  import RandomDocPlugin from "../index"
  import { onMount } from "svelte"
  import RandomDocConfig from "../models/RandomDocConfig"
  import { storeName } from "../Constants"
  import { showMessage } from "siyuan"

  // props
  export let pluginInstance: RandomDocPlugin
  export let dialog

  let storeConfig: RandomDocConfig
  let showLoading = false
  let customSqlEnabled = false
  let sqlContent = JSON.stringify([])

  const onSaveSetting = async () => {
    dialog.destroy()

    storeConfig.showLoading = showLoading
    storeConfig.customSqlEnabled = customSqlEnabled
    storeConfig.sql = sqlContent
    await pluginInstance.saveData(storeName, storeConfig)

    showMessage(`${pluginInstance.i18n.settingConfigSaveSuccess}`, 2000, "info")
  }

  const onCancel = async () => {
    dialog.destroy()
  }

  onMount(async () => {
    storeConfig = await pluginInstance.loadData(storeName)
    showLoading = storeConfig?.showLoading ?? false
    customSqlEnabled = storeConfig?.customSqlEnabled ?? false
    sqlContent =
      storeConfig?.sql ??
      JSON.stringify([
        {
          name: "默认",
          sql: "SELECT DISTINCT b.root_id FROM blocks b ORDER BY random() LIMIT 1",
        },
        {
          name: "今天",
          sql: "SELECT DISTINCT b.root_id FROM blocks b WHERE strftime('%Y-%m-%d', substr(b.created, 1, 4) || '-' || substr(b.created, 5, 2) || '-' || substr(b.created, 7, 2)) = date('now', 'start of day') ORDER BY random() LIMIT 1",
        },
        {
          name: "3天内",
          sql: "SELECT DISTINCT b.root_id FROM blocks b WHERE strftime('%Y-%m-%d', substr(b.created, 1, 4) || '-' || substr(b.created, 5, 2) || '-' || substr(b.created, 7, 2)) >= date('now', '-3 days') ORDER BY random() LIMIT 1",
        },
        {
          name: "7天内",
          sql: "SELECT DISTINCT b.root_id FROM blocks b WHERE strftime('%Y-%m-%d', substr(b.created, 1, 4) || '-' || substr(b.created, 5, 2) || '-' || substr(b.created, 7, 2)) >= date('now', '-7 days') ORDER BY random() LIMIT 1",
        },
        {
          name: "一个月内",
          sql: "SELECT DISTINCT b.root_id FROM blocks b WHERE strftime('%Y-%m-%d', substr(b.created, 1, 4) || '-' || substr(b.created, 5, 2) || '-' || substr(b.created, 7, 2)) >= date('now', '-1 month') ORDER BY random() LIMIT 1",
        },
        {
          name: "半年内",
          sql: "SELECT DISTINCT b.root_id FROM blocks b WHERE strftime('%Y-%m-%d', substr(b.created, 1, 4) || '-' || substr(b.created, 5, 2) || '-' || substr(b.created, 7, 2)) >= date('now', '-6 months') ORDER BY random() LIMIT 1",
        },
        {
          name: "一年内",
          sql: "SELECT DISTINCT b.root_id FROM blocks b WHERE strftime('%Y-%m-%d', substr(b.created, 1, 4) || '-' || substr(b.created, 5, 2) || '-' || substr(b.created, 7, 2)) >= date('now', '-1 year') ORDER BY random() LIMIT 1",
        },
      ])
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

    <div class="fn__block form-item">
      {pluginInstance.i18n.customSqlEnabled}
      <div class="b3-label__text form-item-tip">{pluginInstance.i18n.customSqlEnabledTip}</div>
      <span class="fn__hr" />
      <input class="b3-switch fn__flex-center" id="syncCss" type="checkbox" bind:checked={customSqlEnabled} />
    </div>

    {#if customSqlEnabled}
      <div class="fn__block form-item">
        {pluginInstance.i18n.sqlContent}
        <div class="b3-label__text form-item-tip">{pluginInstance.i18n.sqlContentTip}</div>
        <span class="fn__hr" />
        <textarea
          class="b3-text-field fn__block"
          id="regCode"
          bind:value={sqlContent}
          rows="5"
          placeholder={pluginInstance.i18n.sqlContentTip}
        />
      </div>
    {/if}

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
