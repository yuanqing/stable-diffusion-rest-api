import { exec } from 'child_process'

export async function executeShellCommandAsync(command: string): Promise<void> {
  await new Promise<void>(function (resolve, reject) {
    exec(command, {}, function (error) {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}
